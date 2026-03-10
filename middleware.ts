import { NextRequest, NextResponse } from "next/server";

// Rate limiting applied to /api/analyze and /api/generate
// Uses @upstash/ratelimit + @vercel/kv when env vars are present;
// falls back to a no-op in local dev so missing KV config doesn't break the dev server.

const RATE_LIMITED_PATHS = ["/api/analyze", "/api/generate"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only enforce rate limits when KV is configured
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    return NextResponse.next();
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { kv } = await import("@vercel/kv");

    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(
        parseInt(process.env.RATE_LIMIT_PER_IP || "8"),
        "24 h"
      ),
    });

    // Use the forwarded IP or fall back to a header
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    const { success, reset } = await ratelimit.limit(`rl:${ip}`);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Come back tomorrow — or share this with a friend 😉",
          retry_after_seconds: retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }
  } catch (err) {
    // If rate limiter fails for any reason, allow the request through
    console.error("Rate limiter error:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/analyze", "/api/generate"],
};
