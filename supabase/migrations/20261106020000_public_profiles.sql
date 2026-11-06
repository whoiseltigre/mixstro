-- Public music pages: app.mixstro.com/m/<username> (and /@<username>) can be opened
-- signed out, so a profile can be shared to Instagram, Facebook and the rest.
-- Signed-out visitors never read tables directly: one security definer function returns
-- only the public fields, and nothing at all for someone who turned their page off.

alter table public.profiles add column if not exists public_page boolean not null default true;

-- Where a new member came from, for the first-100-users metrics.
alter table public.profiles add column if not exists invited_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists invite_source text
  check (invite_source in ('page', 'share', 'tag', 'invite'));

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
