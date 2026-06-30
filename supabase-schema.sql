-- DadOps — MVP schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

create table if not exists feeds (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,           -- 'matt' | 'jhomaira' | 'omaira'
  type text not null,                -- 'breast' | 'bottle'
  side text,                         -- 'L' | 'R' | 'Both' (breast only)
  vol_ml int,                        -- bottle only
  created_at timestamptz not null default now()
);

create table if not exists nappies (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,
  type text not null,                -- 'wet' | 'dirty' | 'both'
  created_at timestamptz not null default now()
);

create table if not exists sleeps (
  id uuid primary key default gen_random_uuid(),
  start_ts timestamptz not null default now(),
  end_ts timestamptz,
  by_person text not null,
  created_at timestamptz not null default now()
);

create table if not exists temps (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,
  c numeric not null,                -- celsius reading
  created_at timestamptz not null default now()
);

create table if not exists daily_log (
  id uuid primary key default gen_random_uuid(),
  person_id text not null,
  date timestamptz not null default now(),
  score_night int,
  score_rel int,
  score_conf int,
  score_energy int,
  text_mind text,
  text_win text,
  day_tag text,
  reflection text,
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- 'physical' | 'social' | 'feeding' | 'sleep'
  title text not null,
  notes text,
  date_label text,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────────
-- MVP: enabled with a single open policy for the shared anon key, since
-- this is a private family app and the key is never public-facing.
-- Fast-follow: add Supabase Auth + per-person RLS (see handover doc §9)
-- before this ever leaves your household network.

alter table feeds enable row level security;
alter table nappies enable row level security;
alter table sleeps enable row level security;
alter table temps enable row level security;
alter table daily_log enable row level security;
alter table milestones enable row level security;

create policy "anon full access" on feeds for all using (true) with check (true);
create policy "anon full access" on nappies for all using (true) with check (true);
create policy "anon full access" on sleeps for all using (true) with check (true);
create policy "anon full access" on temps for all using (true) with check (true);
create policy "anon full access" on daily_log for all using (true) with check (true);
create policy "anon full access" on milestones for all using (true) with check (true);

-- ── Realtime ─────────────────────────────────────────────────────────
-- Enable realtime so all three surfaces (Matt's phone, Jhomaira's phone,
-- tablet) update live without refreshing.
alter publication supabase_realtime add table feeds, nappies, sleeps, temps, milestones;
