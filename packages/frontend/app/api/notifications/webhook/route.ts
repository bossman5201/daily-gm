import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

/**
 * Webhook receiver for Farcaster notification events.
 * 
 * Farcaster clients POST here when:
 * - frame_added / notifications_enabled → save token
 * - frame_removed / notifications_disabled → delete token
 * 
 * Security:
 * - Validates notification_url against Farcaster allowlist
 * - Limits tokens per FID to prevent spam
 * - Validates FID type
 */

// Only accept notification URLs from legitimate Farcaster infrastructure
const ALLOWED_NOTIFICATION_HOSTS = [
    'api.farcaster.xyz',
    'api.warpcast.com',
];

const MAX_TOKENS_PER_FID = 10;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, fid, notificationDetails } = body;

        // Validate FID — must be a positive integer
        if (!fid || typeof fid !== 'number' || fid < 1 || !Number.isInteger(fid)) {
            return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (event === 'frame_added' || event === 'notifications_enabled') {
            // User opted in — save their notification token
            if (!notificationDetails?.token || !notificationDetails?.url) {
                // User added frame but declined notifications — that's OK
                return NextResponse.json({ success: true, message: 'No notification details' });
            }

            // --- SECURITY: Validate notification_url against allowlist ---
            try {
                const url = new URL(notificationDetails.url);
                if (!ALLOWED_NOTIFICATION_HOSTS.some(h => url.hostname === h)) {
                    console.warn(`Rejected notification URL from non-Farcaster host: ${url.hostname}`);
                    return NextResponse.json({ error: 'Invalid notification URL' }, { status: 400 });
                }
            } catch {
                return NextResponse.json({ error: 'Malformed notification URL' }, { status: 400 });
            }

            // --- SECURITY: Rate limit tokens per FID ---
            const { count } = await (supabase.from('notification_tokens') as any)
                .select('*', { count: 'exact', head: true })
                .eq('fid', Number(fid));

            if (count !== null && count >= MAX_TOKENS_PER_FID) {
                return NextResponse.json({ error: 'Token limit reached for this FID' }, { status: 429 });
            }

            const { error } = await (supabase.from('notification_tokens') as any).upsert(
                {
                    fid: Number(fid),
                    token: String(notificationDetails.token).slice(0, 512), // Truncate to prevent oversized tokens
                    notification_url: notificationDetails.url,
                },
                { onConflict: 'fid,token' }
            );

            if (error) {
                console.error('Failed to save notification token:', error);
                return NextResponse.json({ error: 'DB error' }, { status: 500 });
            }

            return NextResponse.json({ success: true });
        }

        if (event === 'frame_removed' || event === 'notifications_disabled') {
            // User opted out — remove all their tokens
            const { error } = await (supabase.from('notification_tokens') as any)
                .delete()
                .eq('fid', Number(fid));

            if (error) {
                console.error('Failed to delete notification token:', error);
                return NextResponse.json({ error: 'DB error' }, { status: 500 });
            }

            return NextResponse.json({ success: true });
        }

        // Unknown event — acknowledge gracefully
        return NextResponse.json({ success: true, message: `Ignored event: ${event}` });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
