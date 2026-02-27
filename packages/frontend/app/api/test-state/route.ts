import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { rows } = await sql`SELECT user_address, tx_hash FROM public.gm_events LIMIT 1;`;
        if (rows.length === 0) return NextResponse.json({ error: "No events" });

        const addr = rows[0].user_address;

        return NextResponse.json({
            address_in_db: addr,
            length: addr.length,
            is_valid_eth_len: addr.length === 42,
            hash: rows[0].tx_hash
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
