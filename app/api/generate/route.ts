import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic();
const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const brand = await req.json();

    // Step 1: Claude writes the image prompt
    const promptMessage = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are a creative director writing a prompt for DALL-E 3.

CARDINAL RULE: The character reflects the USER'S brand. The swag reflects SUPERED's brand. Both must be clearly visible.

CHARACTER: ${brand.agent_character}
BRAND COLORS (go ON the character): ${brand.primary_color}, ${brand.secondary_color}
SWAG ITEM: ${brand.swag_item}
POSE: ${brand.pose}
TONE: ${brand.tone}
BRAND NAME: ${brand.brand_name}

SUPERED BRAND: Hot pink #E5097F, cobalt blue #006E97, gold #FEBD3B, dark navy #2B2E4A. Bold heavy all-caps "SUPERED" wordmark with lightning bolt icon.

Write a DALL-E 3 image prompt following these rules:
- The ${brand.swag_item} must be clearly Supered-branded with "SUPERED" text and a lightning bolt
- If wearable: character is WEARING it. If luxury object: character poses WITH it.
- Art style: bold vector illustration or editorial illustration — NOT photorealistic
- Background: uses the brand's colors as a simple gradient or flat wash
- Portrait orientation (taller than wide)
- Superhero poster energy — confident, heroic, a little playful
- No text in image EXCEPT "SUPERED" on the swag item
- Clean composition, high visual impact at thumbnail size

Return ONLY the prompt text. Nothing else.`,
      }],
    });

    const imagePrompt = (promptMessage.content[0] as any).text.trim();

    // Step 2: DALL-E 3 generates the image
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1792",
      quality: "standard",
    });

    const imageUrl = imageResponse.data[0].url;

    return NextResponse.json({
      ...brand,
      image_url: imageUrl,
      image_prompt: imagePrompt,
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Generation failed" }, { status: 500 });
  }
}
