-- DadOps v6 — Routine configuration
-- Run in Supabase SQL Editor after v4 and v5.

create table if not exists routine_config (
  id int primary key default 1,
  feed_interval_mins int default 180,
  feed_target_ml int default 60,
  feed_type text default 'formula',
  max_awake_mins int default 90,
  expected_nap_mins int default 45,
  phase_label text default 'Newborn',
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
insert into routine_config (id) values (1) on conflict do nothing;
create policy "anon full access" on routine_config
  for all using (true) with check (true);
