import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        if (type === 'live-gms') {
            // Fetch the last 20 GM events natively, joined with the users table to attach any cached Farcaster profiles
            const { rows: events } = await sql`
                SELECT g.tx_hash, g.user_address, g.streak, g.block_timestamp, g.created_at, 
                       u.farcaster_username, u.farcaster_pfp_url
                FROM public.gm_events g
                LEFT JOIN public.users u ON LOWER(g.user_address) = LOWER(u.address)
                ORDER BY g.created_at DESC
                LIMIT 20;
            `;
            return NextResponse.json(events);
        }

        if (type === 'leaderboard') {
            // Fetch top 50 users by longest streak and include their cached Farcaster Profiles
            const { rows: users } = await sql`
                SELECT address, current_streak, longest_streak, total_gms, last_gm,
                       farcaster_username, farcaster_pfp_url
                FROM public.users
                ORDER BY longest_streak DESC, total_gms DESC
                LIMIT 50;
            `;
            return NextResponse.json(users);
        }

        if (type === 'heatmap') {
            const address = searchParams.get('address');
            if (!address) return new NextResponse('Missing address', { status: 400 });

            // Fetch user's GM dates
            const { rows: heatmapData } = await sql`
                 SELECT block_timestamp
                 FROM public.gm_events
                 WHERE LOWER(user_address) = LOWER(${address})
                 ORDER BY block_timestamp ASC;
             `;
            return NextResponse.json(heatmapData);
        }

        if (type === 'today-count') {
            // Get start of today (UTC)
            const now = new Date();
            const todayStart = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime() / 1000);

            const { rows: todayData } = await sql`
                SELECT COUNT(*) as exact_count
                FROM public.gm_events
                WHERE block_timestamp >= ${todayStart};
            `;

            return NextResponse.json({ count: parseInt(todayData[0]?.exact_count || '0') });
        }

        return new NextResponse('Invalid Type', { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
