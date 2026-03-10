import { Metadata } from "next";
import { kv } from "@vercel/kv";
import Link from "next/link";
import type { GenerationResult } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getResult(id: string): Promise<GenerationResult | null> {
  try {
    return await kv.get<GenerationResult>(`result:${id}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getResult(id);
  if (!result) {
    return { title: "Supered Swag Generator ⚡" };
  }
  const brandName = result.brand_analysis.brand_name;
  const swagItem = result.brand_analysis.swag_item;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://swag.supered.io";

  return {
    title: `${brandName}'s AI agent just got Supered ⚡`,
    description: `See what ${brandName}'s AI agent looks like in Supered swag. Get yours at swag.supered.io`,
    openGraph: {
      title: `${brandName} just got Supered ⚡`,
      description: result.brand_analysis.swag_reasoning,
      images: [
        {
          url: result.image_url,
          width: 1024,
          height: 1536,
          alt: `${brandName}'s AI agent wearing a Supered ${swagItem}`,
        },
      ],
      url: `${appUrl}/result/${id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${brandName} just got Supered ⚡`,
      description: result.brand_analysis.swag_reasoning,
      images: [result.image_url],
    },
  };
}

function tierEmoji(tier: string): string {
  if (tier === "tier1") return "👕";
  if (tier === "tier2") return "🎩";
  return "💎";
}

function tierLabel(tier: string): string {
  if (tier === "tier1") return "Wearable";
  if (tier === "tier2") return "Accessory";
  return "Luxury";
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const result = await getResult(id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://swag.supered.io";
  const shareUrl = `${appUrl}/result/${id}`;

  if (!result) {
    return (
      <div style={{ minHeight: "100vh", background: "#2B2E4A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>Result not found</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>This link may have expired (results are kept for 30 days).</p>
        <Link href="/" style={{ padding: "12px 24px", background: "#E5097F", borderRadius: "10px", color: "white", textDecoration: "none", fontWeight: 700 }}>
          ⚡ Generate yours →
        </Link>
      </div>
    );
  }

  const { brand_analysis: brand, image_url, image_prompt } = result;
  const emoji = tierEmoji(brand.swag_tier);
  const label = tierLabel(brand.swag_tier);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div style={{ minHeight: "100vh", background: "#2B2E4A", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontSize: "22px", fontWeight: 900, color: "#E5097F", letterSpacing: "-0.5px", textDecoration: "none" }}>
          ⚡ SUPERED
        </Link>
        <a href="https://supered.io" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", textDecoration: "none" }}>
          What is Supered? →
        </a>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "40px", marginBottom: "40px" }}>
          {/* Image */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <img
              src={image_url}
              alt={`${brand.brand_name}'s AI agent in Supered swag`}
              style={{ width: "100%", maxWidth: "420px", borderRadius: "16px", boxShadow: "0 0 60px rgba(229,9,127,0.3)" }}
            />
            <a
              href={image_url}
              download={`${brand.brand_name.toLowerCase().replace(/\s+/g, "-")}-supered-swag.jpg`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "10px 20px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
            >
              ⬇ Download Image
            </a>
          </div>

          {/* Card */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "rgba(254,189,59,0.15)", border: "1px solid rgba(254,189,59,0.3)", borderRadius: "20px", fontSize: "12px", color: "#FEBD3B", marginBottom: "16px", fontWeight: 600 }}>
              {emoji} {label}
            </div>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, marginBottom: "12px", lineHeight: 1.3, color: "white" }}>
              {brand.brand_name}&apos;s agent just got Supered in a {brand.swag_item}. ⚡
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
              {brand.swag_reasoning}
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
              {[
                `Character: ${brand.agent_character.slice(0, 40)}...`,
                `Tone: ${brand.tone}`,
                `Industry: ${brand.industry}`,
              ].map(chip => (
                <span key={chip} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.07)", borderRadius: "20px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                  {chip}
                </span>
              ))}
            </div>

            <details style={{ marginBottom: "28px" }}>
              <summary style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", marginBottom: "8px" }}>
                View image prompt
              </summary>
              <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}>
                {image_prompt}
              </p>
            </details>

            {/* Share strip */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#0A66C2", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}
              >
                Share to LinkedIn
              </a>
            </div>

            {/* Suggested post copy */}
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Suggested post copy
              </p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.6, fontFamily: "monospace" }}>
                {`I just got Supered. ⚡🦸\n\nHere's what my AI agent looks like repping @Supered swag.\n\nWhat does yours look like? → swag.supered.io\n\n#Supered #AI #GetSupered #AIAgent`}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "16px", fontSize: "15px" }}>
            Want to see what YOUR brand looks like?
          </p>
          <Link
            href="/"
            style={{ display: "inline-block", padding: "14px 32px", background: "#E5097F", borderRadius: "10px", color: "white", textDecoration: "none", fontWeight: 800, fontSize: "16px" }}
          >
            ⚡ Suit Up Your Brand →
          </Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.2)", fontSize: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Built by{" "}
        <a href="https://supered.io" style={{ color: "#E5097F", textDecoration: "none" }}>
          Supered
        </a>{" "}
        · Training ≠ Doing
      </footer>
    </div>
  );
}
