import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";
import { uploadImageFromUrl } from "@/lib/storage";
import type { BrandAnalysis, GenerationResult } from "@/lib/types";

const anthropic = new Anthropic();

const IMAGE_PROMPT_TEMPLATE = `You are a creative director writing a prompt for the Ideogram AI image generator.

THE CARDINAL RULE — never violate this:
  CHARACTER = the user's brand identity (their colors, their mascot, their person, their vibe)
  SUPERED SWAG = Supered's brand identity (pink, navy, gold, lightning bolt, SUPERED wordmark)
  Both coexist clearly in the image. Neither overwrites the other.
  User's brand colors go ON THE CHARACTER. Supered's colors go ON THE SWAG.

SUPERED BRAND:
  Logo description: Bold, heavy display lettering (Phosphate-style, thick strokes, all-caps).
     Hot pink (#E5097F) or white. Lightning bolt accent. Superhero energy.
  Palette: hot pink #E5097F, cobalt blue #006E97, gold #FEBD3B, aqua #91D1CE, dark navy #2B2E4A

CHARACTER INFO:
  Type: {{brand_type}}
  Character: {{agent_character}}
  Character's own brand details (goes ON the character, NOT the swag): {{brand_character_details}}
  Brand colors: {{primary_color}}, {{secondary_color}}
  Tone: {{tone}}
  Brand: {{brand_name}}
  Pose: {{pose_variation_seed}}

SWAG INFO:
  Item: {{swag_item}}

{{swag_instructions}}

PERSONAL BRAND SPECIAL INSTRUCTION (only if brand_type === "personal"):
  The character is an AI-illustrated stylized portrait of a real person. Do NOT attempt photorealism.
  Instead: bold editorial illustration style, like a high-end magazine cover or concert poster portrait.
  Capture their described energy and personality visually. They are wearing/interacting with the Supered swag.
  Make them look like a superhero version of themselves.

STYLE REQUIREMENTS (apply to all):
  - Art style: bold vector illustration OR bold editorial illustration — NOT photorealistic, NOT 3D render
  - Mood: confident, heroic, a little playful — mascot poster or concert poster energy
  - Background: use the user's brand colors subtly (flat color, gradient wash, or simple environment)
  - Portrait orientation 2:3 ratio, optimized for LinkedIn sharing
  - No text in image EXCEPT "SUPERED" on the swag item
  - Clean composition, uncluttered, high visual impact at thumbnail size

Write the full Ideogram prompt for {{brand_name}}. Return only the prompt. Nothing else.`;

function buildSwagInstructions(swagItem: string): string {
  const luxuryItems = [
    "lamborghini", "yacht", "jet", "rolex", "throne",
    "trophy", "rocket", "arcade", "check", "helicopter",
  ];
  const isLuxury = luxuryItems.some(l => swagItem.toLowerCase().includes(l));

  if (isLuxury) {
    return `[LUXURY/OBJECT SWAG]:
  The ${swagItem} is prominently Supered-branded. "SUPERED" appears on the object in bold lettering
  (on the hood, hull, fuselage, face, etc.). Color: hot pink or gold primary, navy accents.
  Lightning bolt decal or accent present. The character interacts with or poses beside/in the object.`;
  }

  return `[WEARABLE SWAG]:
  The ${swagItem} is Supered-branded. It features the word "SUPERED" in bold heavy all-caps display
  lettering PLUS a lightning bolt icon. Choose the swag color from Supered's palette that contrasts
  best with the character — hot pink, cobalt blue, gold, aqua, or navy.
  CRITICAL: The "SUPERED" text on the swag must be clearly legible. Emphasize this to Ideogram.`;
}

async function buildImagePrompt(brand: BrandAnalysis): Promise<string> {
  const swagInstructions = buildSwagInstructions(brand.swag_item);

  let promptTemplate = IMAGE_PROMPT_TEMPLATE
    .replace(/{{brand_type}}/g, brand.brand_type)
    .replace(/{{agent_character}}/g, brand.agent_character)
    .replace(/{{brand_character_details}}/g, brand.brand_character_details || "")
    .replace(/{{primary_color}}/g, brand.primary_color)
    .replace(/{{secondary_color}}/g, brand.secondary_color)
    .replace(/{{tone}}/g, brand.tone)
    .replace(/{{brand_name}}/g, brand.brand_name)
    .replace(/{{pose_variation_seed}}/g, brand.pose_variation_seed)
    .replace(/{{swag_item}}/g, brand.swag_item)
    .replace(/{{swag_instructions}}/g, swagInstructions);

  // Remove personal brand instructions if not personal
  if (brand.brand_type !== "personal") {
    promptTemplate = promptTemplate.replace(/PERSONAL BRAND SPECIAL INSTRUCTION[\s\S]*?Make them look like a superhero version of themselves\./m, "");
  }

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: promptTemplate }],
  });

  const textBlock = message.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No prompt generated");
  return textBlock.text.trim();
}

async function generateWithIdeogram(imagePrompt: string): Promise<string> {
  const response = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": process.env.IDEOGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_request: {
        prompt: imagePrompt,
        aspect_ratio: "ASPECT_2_3",
        model: "V_2_TURBO",
        magic_prompt_option: "OFF",
        style_type: "ILLUSTRATION",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ideogram API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as { data: Array<{ url: string }> };
  const tempUrl = data.data?.[0]?.url;
  if (!tempUrl) throw new Error("No image URL returned from Ideogram");
  return tempUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { brand: BrandAnalysis; swag_item?: string };
    const brand: BrandAnalysis = body.brand || (body as unknown as BrandAnalysis);

    // Allow swag swap — override the item
    if (body.swag_item) {
      brand.swag_item = body.swag_item;
    }

    // Step 1: Claude writes the image prompt
    const imagePrompt = await buildImagePrompt(brand);

    // Step 2: Ideogram generates the image
    let tempImageUrl: string;
    try {
      tempImageUrl = await generateWithIdeogram(imagePrompt);
    } catch (ideogramErr) {
      console.error("Ideogram failed:", ideogramErr);
      return NextResponse.json({ error: "image_generation_failed" }, { status: 500 });
    }

    // Step 3: Upload to R2 for permanent URL
    const resultId = nanoid(10);
    let permanentUrl = tempImageUrl;
    let warning: string | undefined;

    try {
      permanentUrl = await uploadImageFromUrl(tempImageUrl, brand.brand_name, resultId);
    } catch (r2Err) {
      console.error("R2 upload failed:", r2Err);
      warning = "temp_url";
      // Fall back to temp URL
    }

    // Step 4: Store result in Vercel KV
    const result: GenerationResult = {
      id: resultId,
      brand_analysis: brand,
      image_url: permanentUrl,
      image_prompt: imagePrompt,
      created_at: new Date().toISOString(),
    };

    try {
      await kv.set(`result:${resultId}`, result, { ex: 2592000 }); // 30 days
    } catch (kvErr) {
      console.error("KV storage failed:", kvErr);
      // Not fatal — result still returned
    }

    return NextResponse.json({
      id: resultId,
      brand_analysis: brand,
      image_url: permanentUrl,
      image_prompt: imagePrompt,
      created_at: result.created_at,
      ...(warning ? { warning } : {}),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    console.error("generate error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
