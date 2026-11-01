-- Projects: the bands and projects someone has played in, LinkedIn style, each with
-- their role, the years, and a few linked tracks. This is the Journey on a profile:
-- old bands and songs from years back sit next to what someone's doing now.
-- Applies after 20261029010000_trust_and_safety.sql (uses public.is_blocked).

create table public.projects (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) <= 80),
  start_year smallint not null check (start_year between 1950 and 2100),
  -- Null means they still play with this project.
  end_year smallint,
  created_at timestamptz not null default now(),
  check (end_year between start_year and 2100)
);
create index projects_profile_idx on public.projects (profile_id);

create table public.project_tracks (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('youtube', 'soundcloud', 'spotify', 'apple_music', 'tiktok', 'instagram')),
  url text not null check (char_length(url) <= 500),
  title text check (char_length(title) <= 120),
  thumb_url text check (char_length(thumb_url) <= 500),
  rank smallint not null default 0
);
create index project_tracks_project_idx on public.project_tracks (project_id, rank);

alter table public.projects enable row level security;
alter table public.project_tracks enable row level security;

-- Anyone signed in can see someone's projects, except between two people where one blocked the other.
create policy "read projects" on public.projects for select to authenticated
  using (not public.is_blocked(auth.uid(), profile_id));
create policy "manage own projects" on public.projects for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "read project tracks" on public.project_tracks for select to authenticated
  using (not public.is_blocked(auth.uid(), profile_id));
-- A track has to belong to one of your own projects.
create policy "manage own project tracks" on public.project_tracks for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.profile_id = auth.uid()));
