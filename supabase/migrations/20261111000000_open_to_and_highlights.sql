-- "Open to" and highlights: the LinkedIn-style parts of a music profile.
-- open_to: what you're up for right now (joining a band, sessions, paid gigs, filling in,
-- teaching, co-writing). Highlights: up to 8 standout moments (a release, a notable show,
-- press, an award), each with an optional year and link.

alter table public.profiles add column if not exists open_to text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_open_to_values;
alter table public.profiles add constraint profiles_open_to_values
  check (open_to <@ array['band', 'sessions', 'gigs', 'fill_in', 'teaching', 'cowrite']::text[]);

create table if not exists public.highlights (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('release', 'show', 'press', 'award', 'other')),
  title text not null check (char_length(title) between 1 and 100),
  detail text check (char_length(detail) <= 140),
  year smallint check (year between 1950 and 2100),
  url text check (char_length(url) <= 500 and url ~ '^https://'),
  rank smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists highlights_profile_idx on public.highlights (profile_id, rank);

alter table public.highlights enable row level security;
drop policy if exists "read highlights" on public.highlights;
create policy "read highlights" on public.highlights for select to authenticated using (true);
drop policy if exists "manage own highlights" on public.highlights;
create policy "manage own highlights" on public.highlights for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- At most 8 per person.
create or replace function public.highlights_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.highlights where profile_id = new.profile_id) >= 8 then
    raise exception 'You can add up to 8 highlights.';
  end if;
  return new;
end;
$$;
drop trigger if exists highlights_limit on public.highlights;
create trigger highlights_limit before insert on public.highlights for each row execute function public.highlights_limit();

-- Public music pages now include both.
create or replace function public.public_profile(p_username text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'first_name', p.first_name,
    'avatar_url', p.avatar_url,
    'instruments', p.instruments,
    'main_instrument', p.main_instrument,
    'genres', p.genres,
    'goals', p.goals,
    'neighborhood', p.neighborhood,
    'verified', p.verified_at is not null,
    'open_to', p.open_to,
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'kind', h.kind, 'title', h.title, 'detail', h.detail, 'year', h.year, 'url', h.url) order by h.rank, h.year desc nulls last)
      from public.highlights h where h.profile_id = p.id
    ), '[]'::jsonb),
    'influences', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.artist_id, 'name', i.artist_name, 'image', i.image_url) order by i.rank)
      from (select * from public.influences where profile_id = p.id order by rank limit 8) i
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'name', pr.name, 'role', pr.role, 'start_year', pr.start_year, 'end_year', pr.end_year,
        'created_at', pr.created_at,
        'project_tracks', coalesce((
          select jsonb_agg(jsonb_build_object('id', t.id, 'provider', t.provider, 'url', t.url, 'title', t.title, 'thumb_url', t.thumb_url, 'rank', t.rank) order by t.rank)
          from public.project_tracks t where t.project_id = pr.id
        ), '[]'::jsonb)
      ))
      from public.projects pr where pr.profile_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.username = lower(p_username)
    and p.onboarded_at is not null
    and p.public_page
    and (auth.uid() is null or not public.is_blocked(auth.uid(), p.id));
$$;

revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
