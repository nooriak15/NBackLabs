-- Fix: my earlier supabase_rls_fix.sql narrowed the participant
-- INSERT/UPDATE policies to `to anon` only. That breaks the case where
-- a signed-in researcher plays through their own session in the same
-- browser tab — they'd be sending the `authenticated` JWT, not anon, and
-- RLS would reject the insert with a 403.
--
-- We re-grant the participant write policies to BOTH anon and
-- authenticated. The READ policies stay `to anon` so they don't leak
-- other researchers' data into the dashboard.
--
-- Paste into Supabase SQL Editor and Run.

-- Subjects: allow both anon and authenticated to update progress
drop policy if exists "Participants can update own progress" on public.subjects;
create policy "Participants can update own progress"
  on public.subjects for update
  to anon, authenticated
  using (true)
  with check (true);

-- Game Results: allow both anon and authenticated to insert results
drop policy if exists "Participants can submit results" on public.game_results;
create policy "Participants can submit results"
  on public.game_results for insert
  to anon, authenticated
  with check (true);
