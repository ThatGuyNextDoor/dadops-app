-- DadOps — full schema
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Idempotent: every statement is guarded (IF NOT EXISTS / ON CONFLICT DO NOTHING /
-- DROP POLICY IF EXISTS before CREATE), so it's safe to re-run against a database
-- that already has some or all of this in place.
--
-- This file replaces the old supabase-schema-v2.sql through -v9.sql patch
-- series (now folded in here) and reflects the actual live schema as of 2026-07-02,
-- including auth removal (open anon-key access — see README-SETUP.md §7) and
-- two fixes applied on top of the old v9 patch: `milestones.deleted_at` (required
-- by every table the app's data hook manages, but missing until now) and the
-- rest of v9 (`photos.nappy_id`, milestone achievement columns), which had been
-- committed to this repo but never actually run against the database.

create extension if not exists "pgcrypto";

-- ── Core activity logs ──────────────────────────────────────────────

create table if not exists feeds (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,              -- 'matt' | 'jhomaira' | 'omaira'
  type text not null,                   -- 'breast' | 'bottle' | 'combo'
  side text,                            -- 'L' | 'R' | 'Both' (breast only)
  vol_ml int,                           -- bottle only (legacy column)
  breast_duration_mins int,
  bottle_vol_ml int,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_feeds_active on feeds (created_at desc) where deleted_at is null;

create table if not exists nappies (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,
  type text not null,                   -- 'wet' | 'dirty' | 'both'
  urine_level text,                     -- 'light' | 'normal' | 'heavy' | null
  stool boolean,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_nappies_active on nappies (created_at desc) where deleted_at is null;

create table if not exists sleeps (
  id uuid primary key default gen_random_uuid(),
  start_ts timestamptz not null default now(),
  end_ts timestamptz,
  by_person text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_sleeps_active on sleeps (start_ts desc) where deleted_at is null;

create table if not exists temps (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  by_person text not null,
  c numeric not null,                   -- celsius reading
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_temps_active on temps (created_at desc) where deleted_at is null;

-- ── Milestones ───────────────────────────────────────────────────────

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  category text not null,               -- 'physical' | 'social' | 'feeding' | 'sleep'
  title text not null,
  notes text,
  date_label text,
  is_recommended boolean default false,
  achievement_key text,
  achievement_date date,
  achievement_comment text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_milestones_active on milestones (created_at desc) where deleted_at is null;

-- ── Daily Log (private per-person reflection) ───────────────────────

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

-- Daily summary ("How's today been?" prompt) — one row per day
create table if not exists daily_summary (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  mood text not null,                   -- 'great' | 'good' | 'mixed' | 'exhausting'
  logged_by text,
  created_at timestamptz not null default now()
);

-- ── People, live status, shifts, holder attribution ─────────────────

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#4ade9a',
  role text not null default 'household', -- 'household' | 'helper'
  display_order int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

insert into people (name, color, role, display_order) values
  ('Matt',     '#4ade9a', 'household', 1),
  ('Jhomaira', '#60a5fa', 'household', 2),
  ('Omaira',   '#c084fc', 'helper',    3)
on conflict do nothing;

create table if not exists live_status (
  id int primary key default 1,          -- singleton; only row id=1 exists
  holder_name text,                      -- who's in charge right now
  status text default 'awake',           -- 'awake' | 'feeding' | 'settling'
  sub_type text,                         -- 'breast' | 'bottle'
  started_at timestamptz,                -- when current activity started
  notes jsonb default '[]',
  updated_at timestamptz default now(),
  constraint live_status_singleton check (id = 1)
);
insert into live_status (id) values (1) on conflict do nothing;

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  notes text,
  status text default 'scheduled',       -- 'scheduled' | 'active' | 'done'
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_shifts_active on shifts (start_ts desc) where deleted_at is null;

create table if not exists holder_log (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

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

-- ── Baby metrics + photos ────────────────────────────────────────────

create table if not exists baby_metrics (
  id uuid primary key default gen_random_uuid(),
  measured_at timestamptz not null default now(),
  weight_kg numeric,
  length_cm numeric,
  head_cm numeric,
  notes text,
  logged_by text,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption text,
  uploaded_by text,
  nappy_id uuid references nappies(id), -- optional: photo taken during a nappy change
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Storage bucket for photos (cannot be created via SQL — do this manually):
-- Dashboard -> Storage -> New bucket -> Name: photos, Type: Public

-- ── Row Level Security ──────────────────────────────────────────────
-- Open anon-key access for every table: this is a private family app and
-- the anon key is never public-facing. See README-SETUP.md §7 for the
-- planned Auth + per-person RLS upgrade before this leaves the household.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'feeds', 'nappies', 'sleeps', 'temps', 'milestones', 'daily_log',
    'daily_summary', 'people', 'live_status', 'shifts', 'holder_log',
    'routine_config', 'baby_metrics', 'photos'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('create policy "anon full access" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ── Realtime ─────────────────────────────────────────────────────────
-- All surfaces (phones + always-on tablet dashboard) update live without
-- refreshing. Guarded so re-running this file doesn't error on tables
-- already added to the publication.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'feeds', 'nappies', 'sleeps', 'temps', 'milestones', 'daily_log',
    'daily_summary', 'people', 'live_status', 'shifts', 'holder_log',
    'routine_config', 'baby_metrics', 'photos'
  ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
