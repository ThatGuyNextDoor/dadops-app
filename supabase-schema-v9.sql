-- DadOps v9 — Nappy photo attachment + Milestones achievement system
-- Run in Supabase SQL Editor after v4 through v8.

-- Nappy photo link — lets a photo taken during nappy logging (Step 3)
-- be associated with the nappy change it documents.
alter table photos add column if not exists nappy_id uuid references nappies(id);

-- Milestone achievement fields (Step 7) — recommended, pre-loaded
-- milestones are tracked as rows keyed by achievement_key so they can
-- be checked off with a date + comment, same audit-trail pattern as
-- the rest of the app (no delete on achieved milestones).
alter table milestones add column if not exists is_recommended boolean default false;
alter table milestones add column if not exists achievement_key text;
alter table milestones add column if not exists achievement_date date;
alter table milestones add column if not exists achievement_comment text;
