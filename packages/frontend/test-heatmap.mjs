import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
    try {
        const { rows } = await sql`SELECT user_address, block_timestamp FROM public.gm_events LIMIT 5;`;
        console.log("Events:", rows);
    } catch (err) {
        console.error("DB Error:", err);
    }
}
run();
