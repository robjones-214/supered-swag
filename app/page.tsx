"use client";
import { useState, useCallback } from "react";
import type { BrandAnalysis, GenerationResult } from "@/lib/types";

const DEMOS = [
  { label: "pandadoc.com", url: "pandadoc.com" },
  { label: "hubspot.com", url: "hubspot.com" },
  { label: "georgebthomas.com", url: "georgebthomas.com" },
];

const STEPS = [
  "Crawling your homepage...",
  "Reading your brand...",
  "Selecting swag...",
  "Generating your image...",
];

const SWAG_TIERS = {
  tier1: {
    emoji: "👕",
    label: "Wearables",
    items: ["t-shirt", "hoodie", "crewneck sweatshirt", "zip-up hoodie", "polo shirt", "long sleeve shirt", "tank top"],
  },
  tier2: {
    emoji: "🎩",
    label: "Accessories",
    items: ["snapback hat", "beanie", "bucket hat", "trucker hat", "headband with lightning bolt", "high-top sneakers", "slides", "socks", "fanny pack", "tote bag", "backpack", "varsity jacket", "bomber jacket", "cape", "windbreaker"],
  },
  tier3: {
    emoji: "💎",
    label: "Luxury",
    items: [
      "Supered-branded Lamborghini (hot pink with gold lightning bolt decals)",
      "Supered-branded yacht (SUPERED on the hull in gold lettering)",
      "Supered-branded private jet (pink and navy livery)",
      "Supered Rolex (pink face, lightning bolt second hand, navy strap)",
      "golden throne with Supered lightning bolt crest",
      "championship trophy engraved with SUPERED",
      "Supered-branded rocket ship",
      "custom arcade cabinet labeled SUPERED: THE GAME",
      "giant novelty check made out to Your AI Agent, signed by Supered",
      "Supered-branded private helicopter (pink and navy)",
    ],
  },
};

function tierFromBrand(tier: string): "tier1" | "tier2" | "tier3" {
  if (tier === "tier1") return "tier1";
  if (tier === "tier2") return "tier2";
  return "tier3";
}

function getTierEmoji(tier: string): string {
  if (tier === "tier1") return "👕";
  if (tier === "tier2") return "🎩";
  return "💎";
}

function getTierLabel(tier: string): string {
  if (tier === "tier1") return "Wearable";
  if (tier === "tier2") return "Accessory";
  return "Luxury";
}

type AppState = "input" | "loading" | "result";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [appState, setAppState] = useState<AppState>("input");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [activeTierTab, setActiveTierTab] = useState<"tier1" | "tier2" | "tier3">("tier1");
  const [showSwapPanel, setShowSwapPanel] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://swag.supered.io";

  const run = useCallback(async (inputVal: string, isHtml?: boolean) => {
    setAppState("loading");
    setLoadingStep(0);
    setResult(null);
    setError("");

    try {
      setLoadingStep(1);
      const analyzePayload = isHtml ? { html: inputVal } : { url: inputVal };

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyzePayload),
      });
      const analyzeData = await analyzeRes.json() as BrandAnalysis & { error?: string };
      if (analyzeData.error === "crawl_failed") {
        setHtmlMode(true);
        setAppState("input");
        setError("We couldn't crawl that URL. Paste the page HTML below instead.");
        return;
      }
      if (analyzeData.error) throw new Error(analyzeData.error);

      setLoadingStep(2);
      setLoadingStep(3);

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: analyzeData }),
      });
      const generateData = await generateRes.json() as GenerationResult & { error?: string };
      if (generateData.error) throw new Error(generateData.error);

      setLoadingStep(4);
      setResult(generateData);
      setAppState("result");

      if (generateData.brand_analysis?.swag_tier) {
        setActiveTierTab(tierFromBrand(generateData.brand_analysis.swag_tier));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(msg);
      setAppState("input");
    }
  }, []);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    run(inputValue.trim(), htmlMode);
  };

  const handleDemo = (url: string) => {
    setInputValue(url);
    setHtmlMode(false);
    run(url, false);
  };

  const handleReset = () => {
    setAppState("input");
    setResult(null);
    setInputValue("");
    setError("");
    setHtmlMode(false);
    setShowSwapPanel(false);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${appUrl}/result/${result.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwapItem = async (item: string) => {
    if (!result || swapLoading) return;
    setSwapLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: result.brand_analysis, swag_item: item }),
      });
      const data = await res.json() as GenerationResult & { error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Swap failed";
      setError(msg);
    } finally {
      setSwapLoading(false);
    }
  };

  const shareUrl = result ? `${appUrl}/result/${result.id}` : "";
  const linkedInUrl = result
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "#";

  return (
    <div style={{ minHeight: "100vh", background: "#2B2E4A", fontFamily: "Inter, sans-serif" }}>
      <header style={{
        padding: "16px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundImage: "radial-gradient(circle, rgba(229,9,127,0.05) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}>
        <span
          style={{ fontSize: "22px", fontWeight: 900, color: "#E5097F", letterSpacing: "-0.5px", cursor: "pointer" }}
          onClick={handleReset}
        >
          ⚡ SUPERED
        </span>
        <a href="https://supered.io" target="_blank" rel="noreferrer"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", textDecoration: "none" }}>
          What is Supered? →
        </a>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}>

        {appState === "input" && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "clamp(28px, 5vw, 50px)",
              fontWeight: 900, lineHeight: 1.1, marginBottom: "16px",
              color: "white", letterSpacing: "-1px",
            }}>
              What does your AI agent look like
              <br />
              <span style={{ color: "#E5097F" }}>in Supered swag?</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "17px", maxWidth: "540px", margin: "0 auto 40px" }}>
              Paste your homepage URL. We&apos;ll crawl it, read your brand, and generate a custom image.{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>Free. No signup.</strong>
            </p>

            {error && (
              <div style={{
                background: "rgba(229,9,127,0.12)", border: "1px solid rgba(229,9,127,0.35)",
                borderRadius: "10px", padding: "12px 16px", marginBottom: "24px",
                color: "#ff6db5", fontSize: "14px", maxWidth: "580px", margin: "0 auto 24px",
              }}>
                {error}
              </div>
            )}

            <div style={{ maxWidth: "580px", margin: "0 auto" }}>
              {!htmlMode ? (
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="yoursite.com"
                    style={{
                      flex: 1, padding: "14px 18px",
                      background: "rgba(255,255,255,0.07)",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px", color: "white", fontSize: "15px",
                      outline: "none", fontFamily: "monospace",
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    style={{
                      padding: "14px 24px", background: "#E5097F", border: "none",
                      borderRadius: "10px", color: "white", fontWeight: 800,
                      fontSize: "15px", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    ⚡ Suit Up →
                  </button>
                </div>
              ) : (
                <div style={{ marginBottom: "12px" }}>
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Paste your page HTML here..."
                    rows={8}
                    style={{
                      width: "100%", padding: "14px 18px",
                      background: "rgba(255,255,255,0.07)",
                      border: "1.5px solid rgba(229,9,127,0.4)",
                      borderRadius: "10px", color: "white", fontSize: "13px",
                      outline: "none", fontFamily: "monospace", resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      onClick={handleSubmit}
                      style={{
                        flex: 1, padding: "14px", background: "#E5097F", border: "none",
                        borderRadius: "10px", color: "white", fontWeight: 800,
                        fontSize: "15px", cursor: "pointer",
                      }}
                    >
                      ⚡ Suit Up from HTML →
                    </button>
                    <button
                      onClick={() => { setHtmlMode(false); setError(""); setInputValue(""); }}
                      style={{
                        padding: "14px 18px", background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px",
                        color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer",
                      }}
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {!htmlMode && (
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>Try:</span>
                  {DEMOS.map(d => (
                    <button
                      key={d.url}
                      onClick={() => handleDemo(d.url)}
                      style={{
                        padding: "5px 14px", background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px",
                        color: "rgba(255,255,255,0.65)", fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {appState === "loading" && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "52px", marginBottom: "32px" }} className="pulse-bolt">⚡</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "320px", margin: "0 auto", textAlign: "left" }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  color: i < loadingStep ? "white" : i === loadingStep - 1 ? "#FEBD3B" : "rgba(255,255,255,0.25)",
                  fontSize: "14px", fontFamily: "monospace",
                }}>
                  <span style={{ fontSize: "16px" }}>
                    {i < loadingStep ? "✓" : i === loadingStep - 1 ? "⚡" : "○"}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {appState === "result" && result && (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "40px", marginBottom: "40px",
            }}>
              {/* Image column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ position: "relative", width: "100%" }}>
                  {swapLoading && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(43,46,74,0.8)",
                      borderRadius: "16px", display: "flex", alignItems: "center",
                      justifyContent: "center", zIndex: 10, fontSize: "32px",
                    }}>
                      ⚡
                    </div>
                  )}
                  <img
                    src={result.image_url}
                    alt={`${result.brand_analysis.brand_name}'s AI agent in Supered swag`}
                    style={{
                      width: "100%", borderRadius: "16px",
                      boxShadow: "0 0 60px rgba(229,9,127,0.3)",
                      opacity: swapLoading ? 0.5 : 1, transition: "opacity 0.3s",
                    }}
                  />
                </div>
                <a
                  href={result.image_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "10px 20px", background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
                    color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600,
                  }}
                >
                  ⬇ Download JPEG
                </a>
              </div>

              {/* Card column */}
              <div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "4px 12px", background: "rgba(254,189,59,0.12)",
                  border: "1px solid rgba(254,189,59,0.3)", borderRadius: "20px",
                  fontSize: "12px", color: "#FEBD3B", marginBottom: "16px", fontWeight: 600,
                }}>
                  {getTierEmoji(result.brand_analysis.swag_tier)} {getTierLabel(result.brand_analysis.swag_tier)}
                </div>

                <h2 style={{
                  fontSize: "clamp(18px, 2.5vw, 24px)",
                  fontWeight: 800, marginBottom: "12px", lineHeight: 1.3, color: "white",
                }}>
                  {result.brand_analysis.brand_name}&apos;s agent just got Supered in a{" "}
                  <span style={{ color: "#E5097F" }}>{result.brand_analysis.swag_item}</span>. ⚡
                </h2>

                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", lineHeight: 1.65, marginBottom: "20px" }}>
                  {result.brand_analysis.swag_reasoning}
                </p>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
                  {[
                    `Tone: ${result.brand_analysis.tone}`,
                    `Industry: ${result.brand_analysis.industry}`,
                    result.brand_analysis.brand_type === "personal"
                      ? "Personal Brand"
                      : result.brand_analysis.brand_type === "animal_mascot"
                      ? `Mascot: ${result.brand_analysis.animal_or_character}`
                      : "Company Brand",
                  ].map(chip => (
                    <span key={chip} style={{
                      padding: "4px 10px", background: "rgba(255,255,255,0.07)",
                      borderRadius: "20px", fontSize: "12px", color: "rgba(255,255,255,0.6)",
                    }}>
                      {chip}
                    </span>
                  ))}
                </div>

                <details style={{ marginBottom: "24px" }}>
                  <summary style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", marginBottom: "8px" }}>
                    View image prompt
                  </summary>
                  <p style={{
                    fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.6, background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px",
                  }}>
                    {result.image_prompt}
                  </p>
                </details>

                {/* Share strip */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <a
                    href={linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "10px 16px", background: "#0A66C2", borderRadius: "8px",
                      color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 700,
                    }}
                  >
                    Share to LinkedIn
                  </a>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "10px 16px", background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
                      color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {copied ? "✓ Copied!" : "🔗 Copy Link"}
                  </button>
                  <a
                    href={result.image_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "10px 16px", background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
                      color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600,
                    }}
                  >
                    ⬇ Download JPEG
                  </a>
                </div>

                <div style={{
                  padding: "12px 14px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                }}>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Suggested LinkedIn post
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", lineHeight: 1.6, fontFamily: "monospace", whiteSpace: "pre-line" }}>
                    {`I just got Supered. ⚡🦸\n\nHere's what my AI agent looks like repping @Supered swag.\n\nWhat does yours look like? → swag.supered.io\n\n#Supered #AI #GetSupered #AIAgent`}
                  </p>
                </div>
              </div>
            </div>

            {/* Swag Swap Panel */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px", padding: "24px", marginBottom: "32px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showSwapPanel ? "16px" : "0" }}>
                <h3 style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>
                  Try a different swag item:
                </h3>
                <button
                  onClick={() => setShowSwapPanel(!showSwapPanel)}
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px", color: "rgba(255,255,255,0.5)",
                    padding: "4px 10px", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  {showSwapPanel ? "Hide ↑" : "Show ↓"}
                </button>
              </div>

              {showSwapPanel && (
                <>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                    {(["tier1", "tier2", "tier3"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTierTab(t)}
                        style={{
                          padding: "6px 14px",
                          background: activeTierTab === t ? "rgba(229,9,127,0.2)" : "rgba(255,255,255,0.05)",
                          border: activeTierTab === t ? "1px solid rgba(229,9,127,0.5)" : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "20px",
                          color: activeTierTab === t ? "#E5097F" : "rgba(255,255,255,0.5)",
                          fontSize: "13px", cursor: "pointer",
                          fontWeight: activeTierTab === t ? 700 : 400,
                        }}
                      >
                        {SWAG_TIERS[t].emoji} {SWAG_TIERS[t].label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {SWAG_TIERS[activeTierTab].items.map(item => {
                      const isActive = result.brand_analysis.swag_item === item;
                      return (
                        <button
                          key={item}
                          onClick={() => !isActive && handleSwapItem(item)}
                          disabled={swapLoading}
                          style={{
                            padding: "6px 12px",
                            background: isActive ? "rgba(229,9,127,0.25)" : "rgba(255,255,255,0.06)",
                            border: isActive ? "1px solid rgba(229,9,127,0.6)" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: isActive ? "#E5097F" : "rgba(255,255,255,0.6)",
                            fontSize: "12px",
                            cursor: isActive || swapLoading ? "default" : "pointer",
                            fontWeight: isActive ? 700 : 400,
                            opacity: swapLoading && !isActive ? 0.5 : 1,
                            maxWidth: "260px",
                            textAlign: "left" as const,
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ textAlign: "center", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={handleReset}
                style={{ background: "none", border: "none", color: "#E5097F", fontSize: "15px", cursor: "pointer", fontWeight: 700 }}
              >
                ⚡ Try another brand →
              </button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.2)", fontSize: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Built by{" "}
        <a href="https://supered.io" style={{ color: "#E5097F", textDecoration: "none" }}>Supered</a>
        {" "}· Training ≠ Doing
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        .pulse-bolt { animation: pulse 1.2s ease-in-out infinite; }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
        input:focus { border-color: rgba(229,9,127,0.5) !important; outline: none; }
        textarea:focus { border-color: rgba(229,9,127,0.5) !important; outline: none; }
        details summary { list-style: none; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
