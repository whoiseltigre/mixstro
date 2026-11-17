-- Band pages: app.mixstro.com/b/<id> shows a band with everyone who confirmed they played
-- in it, their roles and years, and the band's tracks. Readable signed out, like music
-- pages, through one security definer function that only returns public fields and
-- leaves out anyone who turned their page off (or blocked you).
create or replace function public.public_band(p_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  with members as (
    select p.id, p.username, p.first_name, p.avatar_url, p.main_instrument, p.instruments, p.neighborhood,
           p.verified_at is not null as verified,
           pr.id as project_id, pr.role, pr.start_year, pr.end_year, bm.joined_at
    from public.band_members bm
    join public.profiles p on p.id = bm.profile_id
    join public.projects pr on pr.id = bm.project_id
    where bm.band_id = p_id
      and p.onboarded_at is not null
      and (auth.uid() is not null or p.public_page)
      and (auth.uid() is null or not public.is_blocked(auth.uid(), p.id))
  )
  select jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'members', (
      select jsonb_agg(jsonb_build_object(
        'username', m.username, 'first_name', m.first_name, 'avatar_url', m.avatar_url,
        'main_instrument', m.main_instrument, 'instruments', m.instruments, 'neighborhood', m.neighborhood,
        'verified', m.verified, 'role', m.role, 'start_year', m.start_year, 'end_year', m.end_year
      ) order by m.joined_at)
      from members m
    ),
    'tracks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'provider', t.provider, 'url', t.url, 'title', t.title, 'thumb_url', t.thumb_url, 'rank', t.rank, 'by', m.first_name) order by m.joined_at, t.rank)
      from public.project_tracks t join members m on m.project_id = t.project_id
    ), '[]'::jsonb)
  )
  from public.bands b
  where b.id = p_id and exists (select 1 from members);
$$;

revoke all on function public.public_band(bigint) from public;
grant execute on function public.public_band(bigint) to anon, authenticated;
