-- DadOps v3 — Supabase Auth + scoped RLS
-- ============================================================
-- STEP 1: Create accounts in Supabase Dashboard
-- Auth → Users → "Add user" (use "Create user", NOT "Invite")
--
--   Email                    Password (4-digit PIN)
--   matt@dadops.local        choose a PIN e.g. 1234
--   jhomaira@dadops.local    choose a PIN e.g. 5678
--   omaira@dadops.local      choose a PIN e.g. 9012
--   tablet@dadops.local      dadops-tablet-2026
--
-- STEP 2: Run this entire file in SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- Set person metadata on each auth user
-- (these JWTs are what RLS policies read)
UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"person_id":"matt","role":"full"}'::jsonb
  WHERE email = 'matt@dadops.local';

UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"person_id":"jhomaira","role":"full"}'::jsonb
  WHERE email = 'jhomaira@dadops.local';

UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"person_id":"omaira","role":"helper"}'::jsonb
  WHERE email = 'omaira@dadops.local';

UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"person_id":"tablet","role":"viewer"}'::jsonb
  WHERE email = 'tablet@dadops.local';

-- ── Drop old open-access policies ────────────────────────────
DROP POLICY IF EXISTS "anon full access" ON feeds;
DROP POLICY IF EXISTS "anon full access" ON nappies;
DROP POLICY IF EXISTS "anon full access" ON sleeps;
DROP POLICY IF EXISTS "anon full access" ON temps;
DROP POLICY IF EXISTS "anon full access" ON daily_log;
DROP POLICY IF EXISTS "anon full access" ON milestones;

-- ── FEEDS ────────────────────────────────────────────────────
CREATE POLICY "feeds_select" ON feeds FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "feeds_insert" ON feeds FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

CREATE POLICY "feeds_update" ON feeds FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

-- ── NAPPIES ──────────────────────────────────────────────────
CREATE POLICY "nappies_select" ON nappies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "nappies_insert" ON nappies FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

CREATE POLICY "nappies_update" ON nappies FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

-- ── SLEEPS ───────────────────────────────────────────────────
CREATE POLICY "sleeps_select" ON sleeps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sleeps_insert" ON sleeps FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

CREATE POLICY "sleeps_update" ON sleeps FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

-- ── TEMPS ────────────────────────────────────────────────────
-- viewer (tablet) can INSERT temps; only full/helper can update them
CREATE POLICY "temps_select" ON temps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "temps_insert" ON temps FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "temps_update" ON temps FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

-- ── MILESTONES ───────────────────────────────────────────────
CREATE POLICY "milestones_select" ON milestones FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "milestones_insert" ON milestones FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

CREATE POLICY "milestones_update" ON milestones FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') IN ('full','helper'));

-- ── DAILY_LOG (private — each person sees only their own rows) ─
CREATE POLICY "daily_log_select" ON daily_log FOR SELECT
  USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('full','helper')
    AND person_id = (auth.jwt()->'user_metadata'->>'person_id')
  );

CREATE POLICY "daily_log_insert" ON daily_log FOR INSERT
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') IN ('full','helper')
    AND person_id = (auth.jwt()->'user_metadata'->>'person_id')
  );

CREATE POLICY "daily_log_update" ON daily_log FOR UPDATE
  USING (
    (auth.jwt()->'user_metadata'->>'role') IN ('full','helper')
    AND person_id = (auth.jwt()->'user_metadata'->>'person_id')
  );
