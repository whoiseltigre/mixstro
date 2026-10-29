-- Journey: a timeline on each profile of tracks by year, each with a short note,
-- so people can show their whole musical history, including songs from years back.
-- Applies after 20261029010000_trust_and_safety.sql (uses public.is_blocked).

create table public.journey_entries (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null check (year between 1950 and 2100),
  provider text not null check (provider in ('youtube', 'soundcloud', 'spotify', 'apple_music', 'tiktok', 'instagram')),
  url text not null check (char_length(url) <= 500),
  title text check (char_length(title) <= 120),
  thumb_url text check (char_length(thumb_url) <= 500),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index journey_entries_profile_idx on public.journey_entries (profile_id, year desc);

alter table public.journey_entries enable row level security;

-- Anyone signed in can see a journey, except between two people where one blocked the other.
create policy "read journeys" on public.journey_entries for select to authenticated
  using (not public.is_blocked(auth.uid(), profile_id));
create policy "manage own journey" on public.journey_entries for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
