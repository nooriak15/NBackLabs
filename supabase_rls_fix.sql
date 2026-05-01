-- Tighten RLS so researchers don't see other researchers' sessions through
-- the public-read policy. The original policies allowed both `anon` and
-- `authenticated` roles to SELECT all active sessions / subjects / results.
-- Multiple SELECT policies are OR'd together by Postgres, so a logged-in
-- researcher would see (their own) OR (every active session). We restrict
-- the "anyone can read" policies to the `anon` role only.
--
-- Paste this into the Supabase SQL Editor and Run.

-- Sessions
drop policy if exists "Anyone can read active sessions" on public.sessions;
create policy "Anyone can read active sessions"
  on public.sessions for select
  to anon
  using (status = 'active');

-- Subjects
drop policy if exists "Anyone can read subjects" on public.subjects;
create policy "Anyone can read subjects"
  on public.subjects for select
  to anon
  using (true);

drop policy if exists "Participants can update own progress" on public.subjects;
create policy "Participants can update own progress"
  on public.subjects for update
  to anon
  using (true)
  with check (true);

-- Game Results — participants need to read existing results to know which
-- games they've already finished, but only as the anon role. Researchers
-- read via the "Researchers see results for own sessions" policy.
drop policy if exists "Participants can read own results" on public.game_results;
create policy "Participants can read own results"
  on public.game_results for select
  to anon
  using (true);

drop policy if exists "Participants can submit results" on public.game_results;
create policy "Participants can submit results"
  on public.game_results for insert
  to anon
  with check (true);
