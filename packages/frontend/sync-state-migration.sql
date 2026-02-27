create table if not exists public.sync_state (
  id integer primary key,
  last_indexed_block bigint not null,
  updated_at timestamptz default now()
);

-- Ensure only the service_role (the API) can read/write to this sync state
alter table public.sync_state enable row level security;
create policy "Service role only" on public.sync_state
  for all using (auth.role() = 'service_role');
