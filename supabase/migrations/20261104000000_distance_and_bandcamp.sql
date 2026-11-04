-- Real distances ("2 mi away", "within 25 mi") and Bandcamp links.
--
-- Each musician's spot is kept as a coarse point (rounded to about 1 km) in its own table that
-- only its owner can read. Other people never see the point: they only get a whole number of
-- miles back from distances_from_me(), the same way the app shows it.

create table if not exists public.profile_locations (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- The neighborhood text this point was looked up from, so a changed neighborhood is looked up again.
  place text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_locations enable row level security;

drop policy if exists "Own location" on public.profile_locations;
create policy "Own location" on public.profile_locations
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Miles from you to each of `ids` that has a location, rounded, never below 1.
create or replace function public.distances_from_me(ids uuid[])
returns table (profile_id uuid, miles integer)
language sql
stable
security definer
set search_path = public
as $$
  select o.profile_id,
    greatest(1, round(3958.8 * 2 * asin(sqrt(
      power(sin(radians(o.lat - me.lat) / 2), 2)
      + cos(radians(me.lat)) * cos(radians(o.lat)) * power(sin(radians(o.lng - me.lng) / 2), 2)
    ))))::integer
  from public.profile_locations me
  join public.profile_locations o on o.profile_id = any (ids) and o.profile_id <> me.profile_id
  where me.profile_id = auth.uid();
$$;

revoke all on function public.distances_from_me(uuid[]) from public, anon;
grant execute on function public.distances_from_me(uuid[]) to authenticated;

-- Bandcamp joins the platforms you can link a track from.
alter table public.clips drop constraint if exists clips_provider_check;
alter table public.clips add constraint clips_provider_check
  check (provider in ('youtube', 'tiktok', 'instagram', 'soundcloud', 'spotify', 'apple_music', 'bandcamp', 'upload'));

alter table public.project_tracks drop constraint if exists project_tracks_provider_check;
alter table public.project_tracks add constraint project_tracks_provider_check
  check (provider in ('youtube', 'soundcloud', 'spotify', 'apple_music', 'tiktok', 'instagram', 'bandcamp'));
