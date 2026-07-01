-- DadOps v4 — Remove auth, restore open anon access
-- Run in Supabase SQL Editor. Wipes every RLS policy in the public
-- schema (including the old auth.role()/auth.jwt() scoped policies
-- on `shifts` from the scrapped auth build) and replaces them with
-- open "anon full access" policies so the app works with no login.

do $$ declare r record; begin
  for r in (select policyname, tablename from pg_policies
            where schemaname = 'public') loop
    execute 'drop policy if exists "' || r.policyname || '" on ' || r.tablename;
  end loop;
end $$;

create policy "anon full access" on feeds for all using (true) with check (true);
create policy "anon full access" on nappies for all using (true) with check (true);
create policy "anon full access" on sleeps for all using (true) with check (true);
create policy "anon full access" on temps for all using (true) with check (true);
create policy "anon full access" on milestones for all using (true) with check (true);
create policy "anon full access" on daily_log for all using (true) with check (true);
create policy "anon full access" on live_status for all using (true) with check (true);
create policy "anon full access" on shifts for all using (true) with check (true);
create policy "anon full access" on people for all using (true) with check (true);
create policy "anon full access" on baby_metrics for all using (true) with check (true);
create policy "anon full access" on photos for all using (true) with check (true);
create policy "anon full access" on holder_log for all using (true) with check (true);
create policy "anon full access" on daily_summary for all using (true) with check (true);
