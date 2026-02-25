import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (resets on cold start, which is fine for Vercel)
const rateLimit = new Map<string, { count: number; timestamp: number }>();

const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS = 50;  // 50 requests per minute per IP

export function middleware(req: NextRequest) {
    const ip = (req as any).ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const window = rateLimit.get(ip);

    // Clean up old entries periodically (prevent memory leak)
    if (rateLimit.size > 10_000) {
        for (const [key, val] of rateLimit) {
            if (now - val.timestamp > WINDOW_MS) rateLimit.delete(key);
        }
    }

    if (window && now - window.timestamp < WINDOW_MS) {
        if (window.count >= MAX_REQUESTS) {
            return new NextResponse('Too many requests', {
                status: 429,
                headers: { 'Retry-After': '60' },
            });
        }
        window.count += 1;
    } else {
        rateLimit.set(ip, { count: 1, timestamp: now });
    }

    return NextResponse.next();
}

// Only rate-limit page routes and API, not static assets
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.mp3).*)'],
};
