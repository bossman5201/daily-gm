import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, txHash } = body;

        if (!address || !txHash) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        // 1. Get current stats
        const { rows: users } = await sql`
            SELECT current_streak, longest_streak, total_gms, last_gm
            FROM public.users
            WHERE LOWER(address) = LOWER(${address})
            LIMIT 1;
        `;

        let currentStreak = 0;
        let totalGms = 0;
        let longestStreak = 0;
        let lastGmSeconds = 0;

        if (users.length > 0) {
            currentStreak = users[0].current_streak;
            totalGms = users[0].total_gms;
            longestStreak = users[0].longest_streak;

            if (users[0].last_gm) {
                lastGmSeconds = Math.floor(new Date(users[0].last_gm).getTime() / 1000);
            }
        }

        const nowSeconds = Math.floor(Date.now() / 1000);

        // Guard: Reject if within 20-hour cooldown (prevents double-fire from fallback)
        if (lastGmSeconds > 0 && (nowSeconds - lastGmSeconds) < 20 * 3600) {
            return NextResponse.json({ success: false, reason: 'cooldown' }, { status: 429 });
        }

        let newStreak = 1;

        if (lastGmSeconds > 0) {
            const timeSinceLastGM = nowSeconds - lastGmSeconds;
            // If they are within the 48 hour window, they continue the streak
            if (timeSinceLastGM <= 48 * 3600) {
                newStreak = currentStreak + 1;
            } else {
                newStreak = 1;
            }
        }

        const newTotalGms = totalGms + 1;
        const newLongestStreak = Math.max(longestStreak, newStreak);
        const newLastGm = new Date().toISOString();

        // 2. Insert Optimistic Event
        await sql`
            INSERT INTO public.gm_events (user_address, streak, block_number, block_timestamp, tx_hash, created_at, event_type)
            VALUES (${address}, ${newStreak}, 0, ${nowSeconds}, ${txHash}, NOW(), 'gm')
            ON CONFLICT (tx_hash) DO NOTHING;
        `;

        // 3. Update User Optimistically
        await sql`
            INSERT INTO public.users (address, current_streak, longest_streak, total_gms, last_gm, updated_at)
            VALUES (${address}, ${newStreak}, ${newLongestStreak}, ${newTotalGms}, NOW(), NOW())
            ON CONFLICT (address) DO UPDATE SET 
                current_streak = EXCLUDED.current_streak,
                longest_streak = EXCLUDED.longest_streak,
                total_gms = EXCLUDED.total_gms,
                last_gm = EXCLUDED.last_gm,
                updated_at = NOW();
        `;

        return NextResponse.json({ success: true, optimisticStreak: newStreak });
    } catch (error) {
        console.error('Optimistic Insert Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
