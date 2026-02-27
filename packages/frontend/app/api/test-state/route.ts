import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { rows: gmEvents } = await sql`SELECT * FROM public.gm_events LIMIT 5;`;
        return NextResponse.json({
            gmEvents
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
