-- DadOps v5 — Steps 6-10 schema
-- Run in Supabase SQL Editor after v2, v3, v4.
-- Safe to re-run: all CREATE uses IF NOT EXISTS; DROPs are guarded.

-- ============================================================
-- STEP 6 — People table (replaces hardcoded PEOPLE constant)
-- ============================================================
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#4ade9a',
  role text NOT NULL DEFAULT 'household', -- 'household' | 'helper'
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access" ON people;
CREATE POLICY "anon full access" ON people
  FOR ALL USING (true) WITH CHECK (true);

-- Seed the three existing people (skip if already seeded)
INSERT INTO people (name, color, role, display_order) VALUES
  ('Matt',     '#4ade9a', 'household', 1),
  ('Jhomaira', '#60a5fa', 'household', 2),
  ('Omaira',   '#c084fc', 'helper',    3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6 — Live status singleton (who's in charge + activity)
-- ============================================================
CREATE TABLE IF NOT EXISTS live_status (
  id int PRIMARY KEY DEFAULT 1,    -- singleton; only row id=1 exists
  holder_name text,                -- who's in charge right now
  status text DEFAULT 'awake',     -- 'awake' | 'feeding' | 'settling'
  sub_type text,                   -- 'breast' | 'bottle'
  started_at timestamptz,          -- when current activity started
  notes jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT live_status_singleton CHECK (id = 1)
);
ALTER TABLE live_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access" ON live_status;
CREATE POLICY "anon full access" ON live_status
  FOR ALL USING (true) WITH CHECK (true);

-- Insert the singleton row (no-op if already exists)
INSERT INTO live_status (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 7 — Shifts table (replaces v4 shifts with richer schema)
-- Drop and recreate; v4 shifts had no real data yet.
-- ============================================================
DROP TABLE IF EXISTS shifts CASCADE;
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  start_ts timestamptz NOT NULL,
  end_ts timestamptz NOT NULL,
  notes text,
  status text DEFAULT 'scheduled', -- 'scheduled' | 'active' | 'done'
  created_at timestamptz DEFAULT now()
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access" ON shifts;
CREATE POLICY "anon full access" ON shifts
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 8 — Feed table: add breast_duration_mins column
-- (bottle_vol_ml added as alias; keep vol_ml for back-compat)
-- ============================================================
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS breast_duration_mins int;
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS bottle_vol_ml int;

-- Nappy table: granular urine/stool tracking
ALTER TABLE nappies ADD COLUMN IF NOT EXISTS urine_level text; -- 'light'|'normal'|'heavy'|null
ALTER TABLE nappies ADD COLUMN IF NOT EXISTS stool boolean;

-- ============================================================
-- STEP 9 — Baby metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS baby_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at timestamptz NOT NULL DEFAULT now(),
  weight_kg numeric,
  length_cm numeric,
  head_cm numeric,
  notes text,
  logged_by text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE baby_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access" ON baby_metrics;
CREATE POLICY "anon full access" ON baby_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 10 — Photos
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  caption text,
  uploaded_by text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon full access" ON photos;
CREATE POLICY "anon full access" ON photos
  FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for photos:
-- Dashboard → Storage → New bucket
-- Name: photos   Type: Public
-- (Cannot create buckets via SQL — must be done manually)

-- ============================================================
-- AUTH REMOVAL — drop auth-gated policies, open to anon
-- (Auth was scrapped in v5; all tables now use anon full access)
-- ============================================================
DROP POLICY IF EXISTS "feeds_select"    ON feeds;
DROP POLICY IF EXISTS "feeds_insert"    ON feeds;
DROP POLICY IF EXISTS "feeds_update"    ON feeds;
DROP POLICY IF EXISTS "anon full access" ON feeds;
CREATE POLICY "anon full access" ON feeds
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "nappies_select"  ON nappies;
DROP POLICY IF EXISTS "nappies_insert"  ON nappies;
DROP POLICY IF EXISTS "nappies_update"  ON nappies;
DROP POLICY IF EXISTS "anon full access" ON nappies;
CREATE POLICY "anon full access" ON nappies
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sleeps_select"   ON sleeps;
DROP POLICY IF EXISTS "sleeps_insert"   ON sleeps;
DROP POLICY IF EXISTS "sleeps_update"   ON sleeps;
DROP POLICY IF EXISTS "anon full access" ON sleeps;
CREATE POLICY "anon full access" ON sleeps
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "temps_select"    ON temps;
DROP POLICY IF EXISTS "temps_insert"    ON temps;
DROP POLICY IF EXISTS "temps_update"    ON temps;
DROP POLICY IF EXISTS "anon full access" ON temps;
CREATE POLICY "anon full access" ON temps
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "milestones_select" ON milestones;
DROP POLICY IF EXISTS "milestones_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_update" ON milestones;
DROP POLICY IF EXISTS "anon full access"  ON milestones;
CREATE POLICY "anon full access" ON milestones
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "daily_log_select" ON daily_log;
DROP POLICY IF EXISTS "daily_log_insert" ON daily_log;
DROP POLICY IF EXISTS "daily_log_update" ON daily_log;
DROP POLICY IF EXISTS "anon full access"  ON daily_log;
CREATE POLICY "anon full access" ON daily_log
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME — enable for all new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE live_status, people, shifts, baby_metrics, photos;
