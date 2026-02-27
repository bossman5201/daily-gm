import { createClient } from '@supabase/supabase-js';

const url = "https://nszwqhzjuxwdxgtlxduw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zendxaHpqdXh3ZHhndGx4ZHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2ODE2NywiZXhwIjoyMDg3NzQ0MTY3fQ.tKYLFNu45CWfD2bvHHwPW4u7x5LNYKpc3-CoSoEHQFU";

const supabase = createClient(url, key);

async function run() {
    console.log("Running SQL Migration...");
    const res = await fetch(`${url}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            query: `
            create table if not exists public.sync_state (
              id integer primary key,
              last_indexed_block bigint not null,
              updated_at timestamptz default now()
            );

            alter table public.sync_state enable row level security;

            create policy "Service role only" on public.sync_state
              for all using (true);
           `
        })
    });

    const text = await res.text();
    console.log("Response:", res.status, text);
}

run().catch(console.error);
