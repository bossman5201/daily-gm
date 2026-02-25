import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

/**
 * Webhook receiver for Farcaster notification events.
 * 
 * Farcaster clients POST here when:
 * - frame_added / notifications_enabled → save token
 * - frame_removed / notifications_disabled → delete token
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, fid, notificationDetails } = body;

        if (!fid) {
            return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (event === 'frame_added' || event === 'notifications_enabled') {
            // User opted in — save their notification token
            if (!notificationDetails?.token || !notificationDetails?.url) {
                // User added frame but declined notifications — that's OK
                return NextResponse.json({ success: true, message: 'No notification details' });
            }

            const { error } = await (supabase.from('notification_tokens') as any).upsert(
                {
                    fid: Number(fid),
                    token: notificationDetails.token,
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
