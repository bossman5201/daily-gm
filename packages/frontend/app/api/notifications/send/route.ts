import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

/**
 * Cron-triggered endpoint that sends "Your streak is about to break!" 
 * notifications to users who haven't said GM today.
 * 
 * Schedule: Daily at 7pm UTC (vercel.json)
 * Protected by: CRON_SECRET
 */
export async function GET(request: Request) {
    // 1. Auth check
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const supabase = getSupabaseAdmin();
        const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

        // 2. Find users at risk of losing their streak
        // Users with active streaks whose last GM was > 20 hours ago
        const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

        const { data: atRiskUsers } = await supabase
            .from('users')
            .select('address, current_streak, last_gm')
            .gt('current_streak', 0)
            .lt('last_gm', twentyHoursAgo) as {
                data: {
                    address: string;
                    current_streak: number;
                    last_gm: string;
                }[] | null
            };

        if (!atRiskUsers || atRiskUsers.length === 0) {
            return NextResponse.json({ message: 'No at-risk users', sent: 0 });
        }

        // 3. We need to match addresses to FIDs to look up tokens
        // Since we don't store FID→address mapping yet, get ALL tokens and send to all
        // This is a simple v1 approach — can be refined later with FID↔address mapping
        const { data: allTokens } = await supabase
            .from('notification_tokens')
            .select('fid, token, notification_url') as {
                data: {
                    fid: number;
                    token: string;
                    notification_url: string;
                }[] | null
            };

        if (!allTokens || allTokens.length === 0) {
            return NextResponse.json({ message: 'No notification tokens', sent: 0 });
        }

        // 4. Group tokens by notification_url (different Farcaster clients have different URLs)
        const urlGroups = new Map<string, string[]>();
        for (const t of allTokens) {
            const existing = urlGroups.get(t.notification_url) || [];
            existing.push(t.token);
            urlGroups.set(t.notification_url, existing);
        }

        // 5. Send notifications in batches (max 100 tokens per request)
        let totalSent = 0;
        const errors: string[] = [];

        for (const [notificationUrl, tokens] of urlGroups) {
            // Chunk into batches of 100
            for (let i = 0; i < tokens.length; i += 100) {
                const batch = tokens.slice(i, i + 100);

                try {
                    const response = await fetch(notificationUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            notificationId: `streak-reminder-${Date.now()}`,
                            title: '🔥 Streak at risk!',
                            body: 'Say GM now before your streak resets at midnight!',
                            targetUrl: APP_URL,
                            tokens: batch,
                        }),
                    });

                    if (response.ok) {
                        const result = await response.json();
                        totalSent += batch.length;

                        // Clean up invalid tokens if the API reports them
                        if (result.invalidTokens && result.invalidTokens.length > 0) {
                            await (supabase.from('notification_tokens') as any)
                                .delete()
                                .in('token', result.invalidTokens);
                        }
                    } else {
                        const errText = await response.text();
                        errors.push(`${notificationUrl}: ${response.status} ${errText}`);
                    }
                } catch (err) {
                    errors.push(`${notificationUrl}: ${String(err)}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            atRiskUsers: atRiskUsers.length,
            tokensSent: totalSent,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Notification sender error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
