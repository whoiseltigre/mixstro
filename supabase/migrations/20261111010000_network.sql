-- Your network: mutual connections on a profile, and "people you may know" from your
-- bands and your connections. Connections stay private (people can only read their own),
-- so both run as security definer for the signed-in person, only ever return public
-- profile fields, and leave out anyone blocked either way. No counts or rankings.

-- Accepted connections of one person, as a set of profile ids.
create or replace function public.connected_ids(p uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select case when from_id = p then to_id else from_id end
  from public.connections
  where status = 'accepted' and (from_id = p or to_id = p);
$$;
revoke all on function public.connected_ids(uuid) from public, anon, authenticated;

-- People both you and p_other are connected with.
create or replace function public.mutual_connections(p_other uuid)
returns table (username citext, first_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select pr.username, pr.first_name, pr.avatar_url
  from public.profiles pr
  where auth.uid() is not null
    and p_other <> auth.uid()
    and not public.is_blocked(auth.uid(), p_other)
    and pr.id in (select public.connected_ids(auth.uid()))
    and pr.id in (select public.connected_ids(p_other))
    and pr.onboarded_at is not null
    and not public.is_blocked(auth.uid(), pr.id)
  order by pr.first_name
  limit 12;
$$;
revoke all on function public.mutual_connections(uuid) from public, anon;
grant execute on function public.mutual_connections(uuid) to authenticated;

-- Up to 12 people you may know, strongest reason first:
--   1) played in a band with one of your bandmates (via a band you share a member with),
--   2) connected with two or more of your connections.
-- Skips you, anyone you already have a Connect with (any state), and blocks.
create or replace function public.people_you_may_know()
returns table (id uuid, username citext, first_name text, avatar_url text, main_instrument text, neighborhood text, reason text, via text, strength int)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  known as (
    select case when c.from_id = me.id then c.to_id else c.from_id end as id
    from public.connections c, me where c.from_id = me.id or c.to_id = me.id
  ),
  my_bandmates as (
    select distinct other.profile_id as id
    from public.band_members mine
    join public.band_members other on other.band_id = mine.band_id and other.profile_id <> mine.profile_id
    join me on mine.profile_id = me.id
  ),
  -- Bandmates of my bandmates, through a band I'm not in.
  via_bands as (
    select theirs.profile_id as id, min(b.name) as band, min(p.first_name) as mate, 3 as strength
    from my_bandmates m
    join public.band_members mb on mb.profile_id = m.id
    join public.band_members theirs on theirs.band_id = mb.band_id and theirs.profile_id <> m.id
    join public.bands b on b.id = mb.band_id
    join public.profiles p on p.id = m.id
    where theirs.profile_id not in (select id from me)
      and not exists (select 1 from public.band_members x, me where x.band_id = mb.band_id and x.profile_id = me.id)
    group by theirs.profile_id
  ),
  -- Connected with at least two of my connections.
  via_connections as (
    select other_id as id, count(*)::int as n, min(p.first_name) as mate
    from (
      select k.id as friend, case when c.from_id = k.id then c.to_id else c.from_id end as other_id
      from public.connections c
      join known k on (c.from_id = k.id or c.to_id = k.id)
      where c.status = 'accepted'
        and k.id in (select public.connected_ids((select id from me)))
    ) f
    join public.profiles p on p.id = f.friend
    where other_id not in (select id from me)
    group by other_id
    having count(*) >= 2
  ),
  ranked as (
    select id, 'Played with ' || mate || ' in ' || band as reason, mate as via, strength from via_bands
    union all
    select id, 'Connected with ' || mate || ' and ' || (n - 1) || ' more you know', mate, 1 + least(n, 1) from via_connections
  ),
  best as (
    select distinct on (r.id) r.* from ranked r order by r.id, r.strength desc
  )
  select pr.id, pr.username, pr.first_name, pr.avatar_url, pr.main_instrument, pr.neighborhood, best.reason, best.via, best.strength
  from best
  join public.profiles pr on pr.id = best.id
  where (select id from me) is not null
    and pr.onboarded_at is not null
    and pr.id not in (select id from known)
    and not public.is_blocked((select id from me), pr.id)
  order by best.strength desc, pr.last_active_at desc
  limit 12;
$$;
revoke all on function public.people_you_may_know() from public, anon;
grant execute on function public.people_you_may_know() to authenticated;
