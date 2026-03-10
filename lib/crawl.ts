import axios from "axios";
import * as cheerio from "cheerio";

export interface CrawlResult {
  title: string;
  description: string;
  ogTags: Record<string, string>;
  logoAlt: string;
  h1: string;
  bodyText: string;
  colors: string[];
  fonts: string[];
  authorInfo: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const res = await axios.get(fullUrl, {
    timeout: 8000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SuperedBot/1.0)" },
  });
  return parseHtml(res.data as string);
}

export function parseHtml(html: string): CrawlResult {
  const $ = cheerio.load(html);

  const title = $("title").text().trim();
  const description = $('meta[name="description"]').attr("content") || "";

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property") || "";
    const content = $(el).attr("content") || "";
    if (prop && content) ogTags[prop] = content;
  });

  const logoAlt =
    $("header img").first().attr("alt") ||
    $('img[class*="logo"]').first().attr("alt") ||
    $('img[alt*="logo" i]').first().attr("alt") ||
    "";

  const h1 = $("h1").first().text().trim();

  // Strip nav/footer/scripts
  $("nav, footer, script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 2500);

  // Extract colors from inline styles and style blocks
  const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)/g;
  const styleContent = $("style").text() + " " + $("[style]").map((_, el) => $(el).attr("style") || "").get().join(" ");
  const colorMatches = styleContent.match(colorRegex) || [];
  const colorSet: Record<string, boolean> = {};
  colorMatches.forEach(c => { colorSet[c] = true; });
  const colors = Object.keys(colorSet).slice(0, 10);

  // Extract fonts
  const fontRegex = /font-family:\s*([^;,"]+)/gi;
  let fontMatch: RegExpExecArray | null;
  const fontSet: Record<string, boolean> = {};
  // eslint-disable-next-line no-cond-assign
  while ((fontMatch = fontRegex.exec(styleContent)) !== null) {
    fontSet[fontMatch[1].trim()] = true;
  }
  const fonts = Object.keys(fontSet).slice(0, 5);

  // Look for personal brand signals: author, byline, about sections
  const authorMeta = $('meta[name="author"]').attr("content") || "";
  const bylineText = $('[class*="byline"], [class*="author"], [class*="about"]').first().text().trim().slice(0, 300);
  const authorInfo = [authorMeta, bylineText].filter(Boolean).join(" | ");

  return { title, description, ogTags, logoAlt, h1, bodyText, colors, fonts, authorInfo };
}

export function crawlResultToText(cr: CrawlResult): string {
  const og = Object.entries(cr.ogTags).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `
Title: ${cr.title}
Description: ${cr.description}
H1: ${cr.h1}
Logo alt text: ${cr.logoAlt}
Author/About info: ${cr.authorInfo}
Open Graph tags:
${og}
Detected colors: ${cr.colors.join(", ")}
Detected fonts: ${cr.fonts.join(", ")}
Body text excerpt:
${cr.bodyText}
  `.trim();
}
