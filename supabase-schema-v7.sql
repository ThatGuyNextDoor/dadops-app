-- DadOps v7 — Daily summary ("How's today been?" prompt)
-- Run in Supabase SQL Editor after v4, v5 and v6.
-- daily_summary is listed as an existing table in the app's current
-- schema, but no CREATE TABLE for it exists in any tracked schema
-- file — this is written defensively with IF NOT EXISTS so it is
-- safe to run whether or not the table already exists.

create table if not exists daily_summary (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  mood text not null, -- 'great' | 'good' | 'mixed' | 'exhausting'
  logged_by text,
  created_at timestamptz default now()
);

drop policy if exists "anon full access" on daily_summary;
create policy "anon full access" on daily_summary
  for all using (true) with check (true);
