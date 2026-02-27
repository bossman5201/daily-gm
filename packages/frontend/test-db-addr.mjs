import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function getAddr() {
    const { rows } = await sql`SELECT user_address, tx_hash FROM public.gm_events LIMIT 1;`;
    if (rows.length > 0) {
        console.log("DB Address:", rows[0].user_address);
        console.log("DB Address Length:", rows[0].user_address.length);
        console.log("Expected : 0xbd14b65E9c6E767F02D19008942946b75fc78a7c");
    }
}
getAddr();
