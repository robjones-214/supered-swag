import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import * as cheerio from "cheerio";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    let html = "";
    try {
      const res = await axios.get(fullUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SuperedBot/1.0)" },
      });
      html = res.data;
    } catch {
      return NextResponse.json({ error: "crawl_failed" }, { status: 422 });
    }

    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const ogImage = $('meta[property="og:image"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();
    const logoAlt = $("header img").first().attr("alt") || $('img[class*="logo"]').first().attr("alt") || "";
    const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 2500);

    const content = `
Title: ${title}
Description: ${description}
H1: ${h1}
Logo alt text: ${logoAlt}
OG Image: ${ogImage}
Body text excerpt: ${bodyText}
    `.trim();

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a brand analyst. Analyze this website content and return ONLY a valid JSON object with no explanation, no markdown, no preamble.

WEBSITE CONTENT:
${content}

Return this exact JSON structure:
{
  "brand_name": "short brand or person name",
  "brand_type": "company" or "personal" or "animal_mascot",
  "agent_character": "description of the character for image gen — robot/android for company, illustrated person for personal brand, animal character for mascot brands",
  "primary_color": "hex or plain english",
  "secondary_color": "hex or plain english",
  "tone": "playful" or "professional" or "bold" or "minimal" or "technical" or "warm" or "futuristic",
  "industry": "1-3 word category",
  "swag_tier": "tier1" or "tier2" or "tier3",
  "swag_item": "single most surprising and on-brand swag item — tier1: t-shirt/hoodie/crewneck/polo, tier2: snapback/beanie/cape/varsity jacket/high-top sneakers/fanny pack, tier3: Supered Lamborghini/Supered yacht/Supered private jet/golden throne/championship trophy",
  "swag_reasoning": "2-3 punchy sentences explaining why this swag fits this brand — hype friend tone not corporate",
  "tier_emoji": "👕" or "🎩" or "💎",
  "tier": "Wearable" or "Accessory" or "Luxury",
  "pose": "short creative pose description like: mid-celebration fist pump or leaning back arms crossed with half smirk",
  "personality": "one sentence brand personality"
}

Rules:
- sparse or unknown brand data → tier3 luxury swag
- bold/playful/zany tone → tier2 or tier3
- professional/minimal → tier1 or tier2
- personal brand site → illustrated person character, tier2 or tier3
- animal in brand name → animal character
- always pick the MOST surprising and shareable swag item, never default to t-shirt unless genuinely best fit`
      }],
    });

    const text = (message.content[0] as any).text.trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const brand = JSON.parse(cleaned);
    return NextResponse.json(brand);

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Analysis failed" }, { status: 500 });
  }
}
