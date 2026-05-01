-- N-Back Labs schema
-- Paste this entire file into Supabase SQL Editor and click Run.

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  session_code text not null unique,
  total_games int not null,
  distribution_mode text not null default 'count' check (distribution_mode in ('count','percentage')),
  distribution_1back int default 0,
  distribution_2back int default 0,
  distribution_3back int default 0,
  stimulus_set jsonb default '[]'::jsonb,
  target_rate int default 30,
  time_between_stimuli int default 2000,
  stimulus_display_time int default 500,
  trials_per_game int default 20,
  number_of_stimuli int default 8,
  include_tutorial bool default false,
  tutorial_n_back_levels jsonb default '[1]'::jsonb,
  include_tutorial_in_analytics bool default false,
  status text default 'active' check (status in ('draft','active','completed')),
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  subject_id text not null,
  name text,
  status text default 'pending' check (status in ('pending','in_progress','completed')),
  games_completed int default 0,
  created_date timestamptz default now(),
  updated_date timestamptz default now(),
  unique (session_id, subject_id)
);

create table if not exists public.game_results (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  subject_id text not null,
  game_index int not null,
  n_back_level int not null,
  true_positives int default 0,
  false_positives int default 0,
  true_negatives int default 0,
  false_negatives int default 0,
  total_score int default 0,
  avg_response_time int default 0,
  trial_count int,
  stimulus_timing int,
  trial_data jsonb default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.stimulus_sets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  stimulus_type text default 'text' check (stimulus_type in ('text','image')),
  stimuli jsonb default '[]'::jsonb,
  stimulus_count int default 0,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

-- ============================================================
-- TRIGGERS: auto-update updated_date on every UPDATE
-- ============================================================

create or replace function public.touch_updated_date() returns trigger as $$
begin
  new.updated_date = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sessions_updated on public.sessions;
drop trigger if exists subjects_updated on public.subjects;
drop trigger if exists game_results_updated on public.game_results;
drop trigger if exists stimulus_sets_updated on public.stimulus_sets;

create trigger sessions_updated before update on public.sessions for each row execute function public.touch_updated_date();
create trigger subjects_updated before update on public.subjects for each row execute function public.touch_updated_date();
create trigger game_results_updated before update on public.game_results for each row execute function public.touch_updated_date();
create trigger stimulus_sets_updated before update on public.stimulus_sets for each row execute function public.touch_updated_date();

-- ============================================================
-- ROW-LEVEL SECURITY
-- Researchers can only see / modify their own data.
-- Participants (anonymous) can read sessions & subjects by their
-- session_code + subject_id, and submit game results.
-- ============================================================

alter table public.sessions enable row level security;
alter table public.subjects enable row level security;
alter table public.game_results enable row level security;
alter table public.stimulus_sets enable row level security;

-- Sessions ---------------------------------------------------
drop policy if exists "Researchers manage own sessions" on public.sessions;
create policy "Researchers manage own sessions"
  on public.sessions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Anyone can read active sessions" on public.sessions;
create policy "Anyone can read active sessions"
  on public.sessions for select
  to anon, authenticated
  using (status = 'active');

-- Subjects ---------------------------------------------------
drop policy if exists "Researchers manage own subjects" on public.subjects;
create policy "Researchers manage own subjects"
  on public.subjects for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid()));

drop policy if exists "Anyone can read subjects" on public.subjects;
create policy "Anyone can read subjects"
  on public.subjects for select
  to anon, authenticated
  using (true);

drop policy if exists "Participants can update own progress" on public.subjects;
create policy "Participants can update own progress"
  on public.subjects for update
  to anon, authenticated
  using (true)
  with check (true);

-- Game Results -----------------------------------------------
drop policy if exists "Researchers see results for own sessions" on public.game_results;
create policy "Researchers see results for own sessions"
  on public.game_results for select
  using (exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid()));

drop policy if exists "Researchers delete results for own sessions" on public.game_results;
create policy "Researchers delete results for own sessions"
  on public.game_results for delete
  using (exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid()));

drop policy if exists "Participants can submit results" on public.game_results;
create policy "Participants can submit results"
  on public.game_results for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Participants can read own results" on public.game_results;
create policy "Participants can read own results"
  on public.game_results for select
  to anon, authenticated
  using (true);

-- Stimulus Sets ----------------------------------------------
drop policy if exists "Researchers manage own stimulus sets" on public.stimulus_sets;
create policy "Researchers manage own stimulus sets"
  on public.stimulus_sets for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- INDEXES (for the most common filters the app does)
-- ============================================================

create index if not exists idx_sessions_owner on public.sessions(owner_id);
create index if not exists idx_sessions_code on public.sessions(session_code);
create index if not exists idx_subjects_session on public.subjects(session_id);
create index if not exists idx_subjects_lookup on public.subjects(session_id, subject_id);
create index if not exists idx_game_results_session on public.game_results(session_id);
create index if not exists idx_game_results_subject on public.game_results(session_id, subject_id);
create index if not exists idx_stimulus_sets_owner on public.stimulus_sets(owner_id);
