import { NextRequest, NextResponse } from 'next/server';

// NOTE: In-memory rate limiting does NOT work on Vercel serverless functions
// (each invocation gets a fresh isolate with empty memory).
//
// Real protection comes from:
// 1. CRON_SECRET on API routes (already implemented)
// 2. Vercel's built-in DDoS protection at the edge
// 3. (Optional) Upstash Redis rate limiter or Vercel WAF for advanced use
//
// This middleware is kept minimal — just a pass-through.

export function middleware(_req: NextRequest) {
    return NextResponse.next();
}

// Only match page routes and API, not static assets
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.mp3).*)'],
};
