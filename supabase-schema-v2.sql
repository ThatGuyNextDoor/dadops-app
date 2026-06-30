-- DadOps v2 migration: soft-delete support
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)
-- Safe to re-run: all statements use IF NOT EXISTS.

ALTER TABLE feeds    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE nappies  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE sleeps   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE temps    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial indexes so the common query (WHERE deleted_at IS NULL) stays fast
-- even once deleted rows accumulate over time.
CREATE INDEX IF NOT EXISTS idx_feeds_active   ON feeds   (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nappies_active ON nappies (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sleeps_active  ON sleeps  (start_ts   DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temps_active   ON temps   (created_at DESC) WHERE deleted_at IS NULL;
