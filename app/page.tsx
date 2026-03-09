"use client";
import { useState } from "react";

const DEMOS = ["pandadoc.com", "hubspot.com", "georgebthomas.com"];
const STEPS = [
  "Crawling your homepage...",
  "Reading your brand...",
  "Selecting swag...",
  "Generating your image...",
];

interface Result {
  brand_name: string;
  swag_item: string;
  swag_reasoning: string;
  tier: string;
  tier_emoji: string;
  tone: string;
  industry: string;
  image_url: string;
  image_prompt: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = async (inputUrl: string) => {
    setLoading(true);
    setStep(0);
    setResult(null);
    setError("");

    try {
      setStep(1);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });
      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) throw new Error(analyzeData.error);

      setStep(2);
      setStep(3);
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: analyzeData }),
      });
      const generateData = await generateRes.json();
      if (generateData.error) throw new Error(generateData.error);

      setStep(4);
      setResult(generateData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(msg);
      setStep(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    run(url.trim());
  };

  const handleDemo = (demo: string) => {
    setUrl(demo);
    run(demo);
  };

  const handleReset = () => {
    setStep(-1);
    setResult(null);
    setUrl("");
    setError("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#2B2E4A" }}>
      <header style={{ padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "22px", fontWeight: 900, color: "#E5097F", letterSpacing: "-0.5px" }}>
          ⚡ SUPERED
        </span>
        <a href="https://supered.io" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", textDecoration: "none" }}>
          What is Supered? →
        </a>
      </header>

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {step === -1 && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.1, marginBottom: "16px", color: "white" }}>
              What does your AI agent look like
              <br />
              <span style={{ color: "#E5097F" }}>in Supered swag?</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "17px", marginBottom: "40px" }}>
              Paste your homepage URL. We&apos;ll read your brand and generate a custom image. Free. No signup.
            </p>

            {error && (
              <div style={{ background: "rgba(229,9,127,0.15)", border: "1px solid rgba(229,9,127,0.4)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", color: "#E5097F", fontSize: "14px" }}>
                {error}
              </div>
            )}

            <div style={{ maxWidth: "580px", margin: "0 auto" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="yoursite.com"
                  style={{ flex: 1, padding: "14px 18px", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "white", fontSize: "15px", outline: "none", fontFamily: "monospace" }}
                />
                <button
                  onClick={handleSubmit}
                  style={{ padding: "14px 24px", background: "#E5097F", border: "none", borderRadius: "10px", color: "white", fontWeight: 800, fontSize: "15px", cursor: "pointer" }}
                >
                  ⚡ Suit Up →
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>Try:</span>
                {DEMOS.map(d => (
                  <button key={d} onClick={() => handleDemo(d)} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "20px", color: "rgba(255,255,255,0.7)", fontSize: "12px", cursor: "pointer" }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && step >= 0 && step < 4 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "32px" }}>⚡</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px", margin: "0 auto", textAlign: "left" }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", color: i < step ? "white" : i === step - 1 ? "#FEBD3B" : "rgba(255,255,255,0.3)", fontSize: "14px", fontFamily: "monospace" }}>
                  <span>{i < step ? "✓" : i === step - 1 ? "⚡" : "○"}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px", marginBottom: "32px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <img src={result.image_url} alt="Generated swag" style={{ width: "100%", borderRadius: "16px", boxShadow: "0 0 40px rgba(229,9,127,0.3)" }} />
                <a href={result.image_url} download="supered-swag.png" target="_blank" rel="noreferrer" style={{ padding: "10px 20px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>
                  ⬇ Download Image
                </a>
              </div>

              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "rgba(254,189,59,0.15)", border: "1px solid rgba(254,189,59,0.3)", borderRadius: "20px", fontSize: "12px", color: "#FEBD3B", marginBottom: "16px", fontWeight: 600 }}>
                  {result.tier_emoji} {result.tier}
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "12px", lineHeight: 1.3, color: "white" }}>
                  {result.brand_name}&apos;s agent just got Supered in a {result.swag_item}. ⚡
                </h2>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
                  {result.swag_reasoning}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
                  {[`Tone: ${result.tone}`, `Industry: ${result.industry}`].map(chip => (
                    <span key={chip} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.07)", borderRadius: "20px", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                      {chip}
                    </span>
                  ))}
                </div>
                <details style={{ marginBottom: "24px" }}>
                  <summary style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", marginBottom: "8px" }}>View image prompt</summary>
                  <p style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}>
                    {result.image_prompt}
                  </p>
                </details>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", background: "#0A66C2", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}
                  >
                    Share to LinkedIn
                  </a>
                  <button onClick={handleCopy} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    {copied ? "✓ Copied!" : "🔗 Copy Link"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={handleReset} style={{ background: "none", border: "none", color: "#E5097F", fontSize: "15px", cursor: "pointer", fontWeight: 600 }}>
                ⚡ Try another brand →
              </button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.2)", fontSize: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Built by <a href="https://supered.io" style={{ color: "#E5097F", textDecoration: "none" }}>Supered</a> · Training ≠ Doing
      </footer>
    </div>
  );
}
