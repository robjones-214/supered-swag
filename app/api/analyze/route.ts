import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { crawlUrl, parseHtml, crawlResultToText } from "@/lib/crawl";
import type { BrandAnalysis } from "@/lib/types";

let _client: Anthropic | null = null;
const getClient = () => (_client ??= new Anthropic());

const BRAND_ANALYSIS_PROMPT = `You are a brand analyst and creative director preparing for an AI image generation task.

WEBSITE CONTENT:
{{EXTRACTED_CONTENT}}

Analyze this brand carefully and return a JSON object. Read ALL instructions before responding.

=== CRITICAL: BRAND TYPE DETECTION ===

You must first determine what kind of brand this is. This controls everything downstream.

1. PERSONAL BRAND: The website is built around a specific named individual — a speaker, coach, consultant,
   solopreneur, creator, or thought leader. Signs: the domain or H1 is the person's name, "I help...",
   first-person hero copy, headshots mentioned, personal bio.
   → If personal brand: set is_personal_brand=true, capture their name and a short description of who they are.
   → The image will feature an AI-illustrated version of this person (not a robot).

2. ANIMAL/MASCOT BRAND: The brand name, logo alt text, or tagline contains or strongly implies an animal
   or named creature. Examples: "panda" in PandaDoc, "bear" in Bear Analytics, "hawk" in Blackhawk,
   "owl" in Hootsuite. Be liberal — if the name contains an animal word, flag it.
   → If animal detected: set animal_or_character to the animal name.

3. COMPANY BRAND (default): A company or product brand without a personal face or animal mascot.
   → Default agent: a sleek humanoid android/robot with the brand's color accents.

Only ONE brand type applies. Priority order: personal brand > animal mascot > company.

=== FIELDS ===

brand_name: Company or person's name.

brand_type: One of: "personal" | "animal_mascot" | "company" | "unknown"

is_personal_brand: true or false

personal_brand_name: Full name of the individual if personal brand, else null.

personal_brand_description: 1-sentence vivid description of who the person is — their role, energy,
  and visual style (e.g., "a high-energy keynote speaker and HubSpot expert known for bold stage presence").
  Used directly in image prompts. Null if not personal brand.

animal_or_character: The animal name if detected (e.g., "panda", "owl"), else null.

agent_character: The final character description for the image.
  - Personal brand → "an AI-illustrated portrait of [personal_brand_name], [personal_brand_description]"
  - Animal mascot → "a [animal] character dressed in [brand tone]-appropriate attire"
  - Company → "a sleek humanoid android with [primary_color] accent panels"

brand_character_details: Visual elements belonging to THE CHARACTER'S OWN APPEARANCE (not the Supered swag).
  Brand colors on their clothing/fur/panels, their own style signals, accessories that reflect their brand.
  This is how the user's brand identity shows through the character before Supered swag is added.

primary_color: Detected brand color (hex preferred, plain English if not detectable).

secondary_color: Secondary brand color.

tone: One of: playful | professional | bold | minimal | technical | warm | futuristic

industry: 1-3 word category (e.g., "document software", "keynote speaking", "e-commerce").

data_richness: "rich" if colors + tone + character all detected confidently. "sparse" if mostly guessing.

swag_tier:
  - Rich data + professional/minimal → "tier1"
  - Rich data + bold/playful/futuristic → "tier2"
  - Sparse data OR very bold/zany brand → "tier3"
  - Personal brand with bold energy → "tier2" or "tier3"
  - Always bias toward the most surprising, shareable choice.

swag_item: The single most surprising and appropriate swag item. Choose from:
  TIER 1: t-shirt, hoodie, crewneck sweatshirt, zip-up hoodie, polo shirt, long sleeve shirt, tank top
  TIER 2: snapback hat, beanie, bucket hat, headband with lightning bolt, high-top sneakers, slides,
   socks, fanny pack, tote bag, backpack, varsity jacket, bomber jacket, cape, windbreaker
  TIER 3: Supered Lamborghini (hot pink, gold lightning bolt decals), Supered yacht (SUPERED on hull),
   Supered private jet (pink/navy livery), Supered Rolex (pink face, lightning bolt hand),
   golden throne with Supered lightning bolt crest, championship trophy engraved SUPERED,
   Supered rocket ship, custom arcade cabinet (SUPERED: THE GAME),
   giant novelty check signed by Supered, Supered private helicopter

swag_reasoning: 2-3 sentences, punchy hype-person tone. Why does THIS swag fit THIS brand specifically?
  Reference actual brand signals. Fun, not corporate. Read like a hype friend, not a consultant.

personality: 1-sentence brand personality summary.

pose_variation_seed: Short creative description of pose + expression that will vary between generations.
  Examples: "leaning back confidently with arms crossed and a half-smirk",
  "mid-celebration fist pump, eyes wide with excitement",
  "looking over shoulder with a knowing grin",
  "standing tall, cape billowing, one fist raised".
  Pick something that fits the brand tone AND creates a memorable image.

Return ONLY valid JSON. No explanation, no markdown, no preamble. Raw JSON only.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; html?: string };
    const { url, html } = body;

    let extractedContent = "";

    if (html) {
      const crawlResult = parseHtml(html);
      extractedContent = crawlResultToText(crawlResult);
    } else if (url) {
      try {
        const crawlResult = await crawlUrl(url);
        extractedContent = crawlResultToText(crawlResult);
      } catch {
        return NextResponse.json({ error: "crawl_failed" }, { status: 422 });
      }
    } else {
      return NextResponse.json({ error: "No URL or HTML provided" }, { status: 400 });
    }

    const prompt = BRAND_ANALYSIS_PROMPT.replace("{{EXTRACTED_CONTENT}}", extractedContent);

    const stream = getClient().messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const message = await stream.finalMessage();
    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in Claude response");
    }

    const cleaned = textBlock.text.trim().replace(/```json[\s\S]*?```|```/g, "").trim();
    let brand: BrandAnalysis;

    try {
      brand = JSON.parse(cleaned) as BrandAnalysis;
    } catch {
      // Retry with stricter prompt
      const retryMessage = await getClient().messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `${prompt}\n\nCRITICAL: Return ONLY raw JSON. No backticks, no markdown, no explanation. Start your response with { and end with }.`,
        }],
      });
      const retryText = retryMessage.content.find(b => b.type === "text");
      if (!retryText || retryText.type !== "text") throw new Error("Retry also failed to return text");
      const retryJson = retryText.text.trim().replace(/```json[\s\S]*?```|```/g, "").trim();
      brand = JSON.parse(retryJson) as BrandAnalysis;
    }

    return NextResponse.json(brand);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    console.error("analyze error:", e);

    // Sparse data fallback — escalate to tier3 luxury as spec'd
    const fallback: BrandAnalysis = {
      brand_name: "Your Brand",
      brand_type: "company",
      is_personal_brand: false,
      personal_brand_name: null,
      personal_brand_description: null,
      animal_or_character: null,
      agent_character: "a sleek humanoid android with silver accent panels and glowing blue eyes",
      brand_character_details: "silver and white body panels with electric blue trim",
      primary_color: "#6366F1",
      secondary_color: "#8B5CF6",
      tone: "professional",
      industry: "technology",
      data_richness: "sparse",
      swag_tier: "tier3",
      swag_item: "golden throne with Supered lightning bolt crest",
      swag_reasoning: "When we can't read your brand, we go full luxury. Mystery brands deserve mystery swag — and nothing says 'we have no idea who you are but we respect it' like a golden throne.",
      personality: "An enigmatic brand with untapped potential.",
      pose_variation_seed: "seated regally on throne, one arm draped over the armrest, slight smirk of absolute confidence",
    };

    if (msg.includes("crawl_failed")) {
      return NextResponse.json({ error: "crawl_failed" }, { status: 422 });
    }
    return NextResponse.json(fallback);
  }
}
