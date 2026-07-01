-- DadOps v8 — Holder log (24-hour attribution)
-- Run in Supabase SQL Editor after v4 through v7.
-- holder_log is listed as an existing table in the app's current
-- schema, but no CREATE TABLE for it exists in any tracked schema
-- file — this is written defensively with IF NOT EXISTS so it is
-- safe to run whether or not the table already exists.

create table if not exists holder_log (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

drop policy if exists "anon full access" on holder_log;
create policy "anon full access" on holder_log
  for all using (true) with check (true);

alter publication supabase_realtime add table holder_log;
