import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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
        const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

        // 2. Find users at risk of losing their streak
        // Users with active streaks whose last GM was > 20 hours ago
        const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

        const { rows: atRiskUsers } = await sql`
            SELECT address, current_streak, last_gm
            FROM public.users
            WHERE current_streak > 0 
            AND last_gm < ${twentyHoursAgo}
        `;

        if (!atRiskUsers || atRiskUsers.length === 0) {
            return NextResponse.json({ message: 'No at-risk users', sent: 0 });
        }

        // 3. Get notification tokens ONLY for users whose streaks are at risk
        // Join through users.farcaster_fid (if stored) or fall back to address-based matching
        // We extract at-risk addresses and find FIDs that have matching profiles
        const atRiskAddresses = atRiskUsers.map(u => u.address);

        if (atRiskAddresses.length === 0) {
            return NextResponse.json({ message: 'No at-risk users', sent: 0 });
        }

        // Get tokens for FIDs that have a profile linked to an at-risk address
        const { rows: atRiskTokens } = await sql`
            SELECT nt.fid, nt.token, nt.notification_url 
            FROM public.notification_tokens nt
            INNER JOIN public.users u ON u.farcaster_fid = nt.fid
            WHERE u.address = ANY(${atRiskAddresses as any}::text[])
        `;

        // Fallback: if no FID↔address mapping exists yet, send to all tokens
        // This preserves v1 behavior until farcaster_fid is populated
        const tokensToUse = atRiskTokens.length > 0 ? atRiskTokens : (await sql`
            SELECT fid, token, notification_url FROM public.notification_tokens
        `).rows;

        if (!tokensToUse || tokensToUse.length === 0) {
            return NextResponse.json({ message: 'No notification tokens', sent: 0 });
        }

        // 4. Group tokens by notification_url (different Farcaster clients have different URLs)
        const urlGroups = new Map<string, string[]>();
        for (const t of tokensToUse) {
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
                            await sql`
                                DELETE FROM public.notification_tokens
                                WHERE token = ANY(${result.invalidTokens as any}::text[])
                            `;
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
