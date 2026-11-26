-- Core loop fixes from the pre-mortem (2026-11-26):
--   1. "Open to remote" and a remote lane that ignores distance
--   2. Reply habits: how reliably someone answers Connects, for a profile line and ranking
--   3. Discovery shows people active in the last 30 days (was 60); public pages stay up
--   4. Connect limits: 5 waiting at once, a daily cap (lower for new accounts), and an
--      opt-in "only verified musicians can Connect with me"
-- Safe to run before or after the app deploy: the app falls back when these are missing.

-- 1) Open to remote ------------------------------------------------------------------------

alter table public.profiles drop constraint if exists profiles_open_to_values;
alter table public.profiles add constraint profiles_open_to_values
  check (open_to <@ array['band', 'sessions', 'gigs', 'fill_in', 'teaching', 'cowrite', 'remote']::text[]);

-- 3) Discovery window: 30 days ------------------------------------------------------------
-- (select * also picks up the columns added to profiles since the view was first made.)
create or replace view public.discoverable_profiles with (security_invoker = true) as
  select * from public.profiles
  where onboarded_at is not null and last_active_at > now() - interval '30 days';

create or replace function public.local_candidates(p_limit integer default 60)
returns table (profile_id uuid, miles integer)
language sql stable security definer set search_path = public as $$
  with me as (select p.id, p.radius_mi, l.lat, l.lng from public.profiles p join public.profile_locations l on l.profile_id = p.id where p.id = auth.uid())
  select p.id, greatest(1, round(3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - me.lat) / 2), 2)
        + cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2)))))::integer
  from me, public.profiles p
  join public.profile_locations l on l.profile_id = p.id
  where p.onboarded_at is not null and p.last_active_at > now() - interval '30 days'
    and p.id <> me.id
    and not exists (select 1 from public.blocks b where (b.blocker_id = me.id and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = me.id))
    and not exists (select 1 from public.connections c where least(c.from_id, c.to_id) = least(me.id, p.id) and greatest(c.from_id, c.to_id) = greatest(me.id, p.id))
    and 3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - me.lat) / 2), 2)
        + cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2))) <= me.radius_mi
  order by p.last_active_at desc, p.id
  limit greatest(1, least(p_limit, 200));
$$;
revoke all on function public.local_candidates(integer) from public, anon;
grant execute on function public.local_candidates(integer) to authenticated;

-- People open to remote, at any distance: active, onboarded, not blocked, not already known.
create or replace function public.remote_candidates(p_limit integer default 30)
returns table (profile_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.onboarded_at is not null and p.last_active_at > now() - interval '30 days'
    and 'remote' = any (p.open_to)
    and not exists (select 1 from public.blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
    and not exists (select 1 from public.connections c where least(c.from_id, c.to_id) = least(auth.uid(), p.id) and greatest(c.from_id, c.to_id) = greatest(auth.uid(), p.id))
  order by p.last_active_at desc, p.id
  limit greatest(1, least(p_limit, 100));
$$;
revoke all on function public.remote_candidates(integer) from public, anon;
grant execute on function public.remote_candidates(integer) to authenticated;

-- 2) Reply habits --------------------------------------------------------------------------
-- Per person, over the last 90 days: Connects they've had time to answer (answered, or
-- waiting 48h+), how many they answered, and the median hours to say yes. Counts only, never
-- who asked; anyone signed in may read it, as it shows on profiles.
create or replace function public.reply_stats(p_ids uuid[])
returns table (profile_id uuid, asked integer, answered integer, median_hours numeric)
language sql stable security definer set search_path = public as $$
  select c.to_id,
    count(*)::integer,
    count(*) filter (where c.status <> 'pending')::integer,
    round((percentile_cont(0.5) within group (order by extract(epoch from (c.accepted_at - c.created_at)) / 3600)
      filter (where c.status = 'accepted' and c.accepted_at is not null))::numeric, 1)
  from public.connections c
  where auth.uid() is not null
    and c.to_id = any (p_ids[1:200])
    and c.created_at > now() - interval '90 days'
    and (c.status <> 'pending' or c.created_at < now() - interval '48 hours')
  group by c.to_id;
$$;
revoke all on function public.reply_stats(uuid[]) from public, anon;
grant execute on function public.reply_stats(uuid[]) to authenticated;

-- 4) Connect limits ------------------------------------------------------------------------

alter table public.profiles add column if not exists connect_verified_only boolean not null default false;

create or replace function public.connection_request_ok(p_from uuid, p_to uuid, p_note text)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  waiting integer;
  today integer;
  newbie boolean;
begin
  if p_from is null then raise exception 'sign in first'; end if;
  if p_to is null or p_to = p_from
     or not exists (select 1 from public.profiles where id = p_to and onboarded_at is not null)
     or public.is_blocked(p_from, p_to) then
    raise exception 'not available';
  end if;
  -- They only take Connects from verified musicians.
  if exists (select 1 from public.profiles where id = p_to and connect_verified_only)
     and not exists (select 1 from public.profiles where id = p_from and verified_at is not null) then
    raise exception 'verified only';
  end if;
  -- At most 5 of your Connects waiting for an answer at once (they expire after 7 days).
  select count(*) into waiting from public.connections
    where from_id = p_from and to_id <> p_to and status = 'pending' and created_at > now() - interval '7 days';
  if waiting >= 5 then raise exception 'too many waiting'; end if;
  -- A daily cap: 10, or 5 in your first week.
  select coalesce(onboarded_at, created_at) > now() - interval '7 days' into newbie from public.profiles where id = p_from;
  select count(*) into today from public.connections
    where from_id = p_from and to_id <> p_to and status <> 'passed' and created_at > now() - interval '24 hours';
  if today >= (case when coalesce(newbie, true) then 5 else 10 end) then raise exception 'daily limit'; end if;
  -- Answering someone's Board post is its own introduction.
  if exists (
    select 1 from public.board_replies r join public.board_posts p on p.id = r.post_id
    where r.from_id = p_from and p.author_id = p_to
  ) then return; end if;
  if p_note is null or char_length(p_note) < 2 then raise exception 'add a note'; end if;
  if not exists (select 1 from public.clips where profile_id = p_from and kind = 'clip')
     and not exists (select 1 from public.project_tracks where profile_id = p_from) then
    raise exception 'add a song';
  end if;
end;
$$;
revoke all on function public.connection_request_ok(uuid, uuid, text) from public, anon;
grant execute on function public.connection_request_ok(uuid, uuid, text) to authenticated;

-- The Nov 11 highlights trigger can land after the Nov 20 lockdown on some databases
-- (production ran them late): it isn't for calling directly.
do $$
begin
  if to_regprocedure('public.highlights_limit()') is not null then
    revoke execute on function public.highlights_limit() from public, anon, authenticated;
  end if;
end $$;
