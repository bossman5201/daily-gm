import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, username, pfpUrl, displayName } = body;

        if (!address) {
            return NextResponse.json({ error: 'Missing ethereum address' }, { status: 400 });
        }

        // Only update these columns if the user passes them from the Farcaster SDK context.
        // We do not overwrite existing valid Farcaster data with nulls if a desktop user hits this.
        if (username || pfpUrl || displayName) {
            await sql`
                UPDATE public.users 
                SET farcaster_username = COALESCE(${username || null}, farcaster_username),
                    farcaster_pfp_url = COALESCE(${pfpUrl || null}, farcaster_pfp_url),
                    farcaster_display_name = COALESCE(${displayName || null}, farcaster_display_name)
                WHERE address = ${address};
            `;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Save profile error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
