-- Daily competition schema for global rankings + answer logs.
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.daily_challenge_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  challenge_date date not null,
  played_at timestamptz not null default now(),
  score integer not null,
  correct integer not null,
  wrong integer not null,
  total integer not null default 10,
  time_seconds numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_date)
);

create table if not exists public.daily_challenge_answers (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.daily_challenge_runs(id) on delete cascade,
  question_index integer not null,
  source_id text not null,
  hitza text not null,
  chosen text not null,
  correct text not null,
  is_correct boolean not null,
  response_ms integer not null,
  points integer not null,
  created_at timestamptz not null default now()
);

create index if not exists daily_challenge_runs_challenge_date_idx
  on public.daily_challenge_runs (challenge_date);
create index if not exists daily_challenge_runs_played_at_idx
  on public.daily_challenge_runs (played_at);
create index if not exists daily_challenge_answers_run_id_idx
  on public.daily_challenge_answers (run_id);

alter table public.daily_challenge_runs enable row level security;
alter table public.daily_challenge_answers enable row level security;

drop policy if exists "daily runs read all authenticated" on public.daily_challenge_runs;
create policy "daily runs read all authenticated"
  on public.daily_challenge_runs
  for select
  to authenticated
  using (true);

drop policy if exists "daily runs insert own" on public.daily_challenge_runs;
create policy "daily runs insert own"
  on public.daily_challenge_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily answers read all authenticated" on public.daily_challenge_answers;
create policy "daily answers read all authenticated"
  on public.daily_challenge_answers
  for select
  to authenticated
  using (true);

drop policy if exists "daily answers insert own run" on public.daily_challenge_answers;
create policy "daily answers insert own run"
  on public.daily_challenge_answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.daily_challenge_runs r
      where r.id = run_id
        and r.user_id = auth.uid()
    )
  );

-- Optional: canonical "active challenge date" controlled from Supabase.
-- App will read this date; if missing, it falls back to local today.
create table if not exists public.daily_challenge_settings (
  id smallint primary key check (id = 1),
  active_challenge_date date not null,
  updated_at timestamptz not null default now()
);

insert into public.daily_challenge_settings (id, active_challenge_date)
values (1, (now() at time zone 'utc')::date)
on conflict (id) do nothing;

alter table public.daily_challenge_settings enable row level security;

drop policy if exists "daily settings read authenticated" on public.daily_challenge_settings;
create policy "daily settings read authenticated"
  on public.daily_challenge_settings
  for select
  to authenticated
  using (true);

-- To manually move the challenge day (example: yesterday in UTC date):
-- update public.daily_challenge_settings
-- set active_challenge_date = ((now() at time zone 'utc')::date - interval '1 day')::date,
--     updated_at = now()
-- where id = 1;
