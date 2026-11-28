-- Handoff PR 4: openings. A Board post can be a structured opening ("we need drums, I play
-- bass, Tue/Thu, South Austin, 10 mi"): it has a status (open, paused, filled, expired), an
-- expiry you renew on purpose, and a local, eligible list of people to meet with honest reasons.
-- The post id stays the one identity. Older posts keep working unchanged. Safe to run twice.

-- 1) The opening's fields on board_posts ---------------------------------------------------
alter table public.board_posts
  add column if not exists needed_role text,                -- family id: "Drums"
  add column if not exists needed_instruments text[],       -- every instrument that counts ("Drum kit", "Percussion"…)
  add column if not exists offered_role text,               -- what the poster plays: "Bass"
  add column if not exists rehearsal_days text[] not null default '{}', -- "Tue", "Thu"
  add column if not exists radius_mi smallint,
  add column if not exists event_date date,                 -- a dated sub request
  add column if not exists status text not null default 'open',
  add column if not exists expires_at timestamptz,
  add column if not exists renewed_at timestamptz;

alter table public.board_posts drop constraint if exists board_posts_opening;
alter table public.board_posts add constraint board_posts_opening check (
  status in ('open', 'paused', 'filled', 'expired')
  and (needed_role is null or char_length(needed_role) <= 40)
  and (offered_role is null or char_length(offered_role) <= 40)
  and (needed_instruments is null or cardinality(needed_instruments) <= 20)
  and cardinality(rehearsal_days) <= 7
  and rehearsal_days <@ array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  and (radius_mi is null or radius_mi between 1 and 100)
) not valid;

-- Older posts: closed ones count as filled (they stop showing either way).
update public.board_posts set status = 'filled' where closed_at is not null and status = 'open';

create index if not exists board_posts_openings_idx on public.board_posts (status, expires_at) where needed_role is not null;

-- Status and the older closed_at stay in step, so older app versions (which close a post by
-- setting closed_at, and list posts where closed_at is null) keep behaving the same.
create or replace function public.board_post_status_sync()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.needed_role is not null and new.expires_at is null then
      new.expires_at := coalesce((new.event_date + 1)::timestamptz, now() + interval '14 days');
    end if;
    new.closed_at := case when new.status = 'open' then null else coalesce(new.closed_at, now()) end;
    return new;
  end if;
  if new.status is distinct from old.status then
    new.closed_at := case when new.status = 'open' then null else coalesce(new.closed_at, now()) end;
  elsif new.closed_at is distinct from old.closed_at then
    new.status := case when new.closed_at is null then 'open' else 'filled' end;
  end if;
  return new;
end;
$$;
revoke all on function public.board_post_status_sync() from public, anon, authenticated;
drop trigger if exists board_post_status_sync on public.board_posts;
create trigger board_post_status_sync before insert or update on public.board_posts
  for each row execute function public.board_post_status_sync();

-- Every change of status, for the funnel (opened, paused, filled, expired, renewed).
create table if not exists public.opening_events (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.board_posts (id) on delete cascade,
  event text not null check (event in ('opened', 'paused', 'filled', 'expired', 'renewed', 'reopened')),
  at timestamptz not null default now()
);
create index if not exists opening_events_post_idx on public.opening_events (post_id, at);
alter table public.opening_events enable row level security;
revoke all on public.opening_events from anon, authenticated;

create or replace function public.opening_event_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.needed_role is null then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.opening_events (post_id, event) values (new.id, 'opened');
  elsif new.status is distinct from old.status then
    insert into public.opening_events (post_id, event)
    values (new.id, case new.status when 'open' then 'reopened' else new.status end);
  elsif new.renewed_at is distinct from old.renewed_at then
    insert into public.opening_events (post_id, event) values (new.id, 'renewed');
  end if;
  return new;
end;
$$;
revoke all on function public.opening_event_log() from public, anon, authenticated;
drop trigger if exists opening_event_log on public.board_posts;
create trigger opening_event_log after insert or update on public.board_posts
  for each row execute function public.opening_event_log();

-- Nobody sees posts from someone they blocked or who blocked them.
drop policy if exists "no board posts across a block" on public.board_posts;
create policy "no board posts across a block" on public.board_posts as restrictive for select to authenticated
  using (not public.is_blocked(auth.uid(), author_id));

-- 2) Owner moves: pause, fill, reopen, renew -----------------------------------------------
create or replace function public.can_manage_post(p_post bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.board_posts p
    where p.id = p_post and (p.author_id = auth.uid() or (p.band_id is not null and public.is_band_member(p.band_id, auth.uid())))
  );
$$;

create or replace function public.set_opening_status(p_post bigint, p_status text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_status not in ('open', 'paused', 'filled') then raise exception 'invalid status'; end if;
  if not public.can_manage_post(p_post) then raise exception 'not yours'; end if;
  update public.board_posts set status = p_status,
    -- Reopening an expired opening is a renewal.
    expires_at = case when p_status = 'open' and expires_at <= now() then now() + interval '14 days' else expires_at end,
    renewed_at = case when p_status = 'open' and expires_at <= now() then now() else renewed_at end
  where id = p_post;
  return p_status;
end;
$$;

create or replace function public.renew_opening(p_post bigint, p_days integer default 14)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  until timestamptz := now() + make_interval(days => greatest(1, least(coalesce(p_days, 14), 60)));
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not public.can_manage_post(p_post) then raise exception 'not yours'; end if;
  update public.board_posts set status = 'open', expires_at = until, renewed_at = now() where id = p_post and status <> 'filled';
  if not found then raise exception 'filled openings stay filled'; end if;
  return until;
end;
$$;

-- Expired openings close themselves (run by the 15-minute job).
create or replace function public.expire_openings()
returns integer language sql volatile security definer set search_path = public as $$
  with x as (
    update public.board_posts set status = 'expired'
    where needed_role is not null and status in ('open', 'paused') and expires_at <= now()
    returning 1
  ) select count(*)::integer from x;
$$;

create table if not exists public.opening_supply (
  post_id bigint primary key references public.board_posts (id) on delete cascade,
  candidates integer not null,
  checked_at timestamptz not null default now()
);
alter table public.opening_supply enable row level security;
revoke all on public.opening_supply from anon, authenticated;

-- 3) Who to meet for an opening ---------------------------------------------------------------
-- Eligibility first, then the limit: a discoverable musician (onboarded, active in 60 days),
-- not you, not blocked either way, not someone you already have a connection row with, who
-- plays the needed role and is within the opening's radius. Ranked by: wants what you play
-- (reciprocal), overlapping rehearsal days, shared artists, then distance, then id.
-- Returns a state too, so "we don't know where you are" is never mistaken for "nobody here".
create or replace function public.opening_candidates(p_post bigint, p_limit integer default 5)
returns table (profile_id uuid, miles integer, reciprocal boolean, shared_days text[], shared_artists integer, state text)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare
  post public.board_posts;
  me uuid := auth.uid();
  here public.profile_locations;
  n integer;
begin
  select * into post from public.board_posts where id = p_post;
  if not found or post.needed_role is null then return; end if;
  if me is null or not public.can_manage_post(p_post) then raise exception 'not yours'; end if;
  if post.status <> 'open' or post.expires_at <= now() then
    return query select null::uuid, null::integer, null::boolean, null::text[], null::integer, 'closed'::text;
    return;
  end if;
  select * into here from public.profile_locations pl where pl.profile_id = post.author_id;
  if not found then
    return query select null::uuid, null::integer, null::boolean, null::text[], null::integer, 'no_location'::text;
    return;
  end if;

  return query
  with eligible as (
    select p.id,
      greatest(1, round(3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - here.lat) / 2), 2)
        + cos(radians(here.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - here.lng) / 2), 2)
      ))))::integer as mi,
      p.alert_roles, p.play_days
    from public.profiles p
    join public.profile_locations l on l.profile_id = p.id
    where p.onboarded_at is not null and p.last_active_at > now() - interval '60 days'
      and p.id <> post.author_id
      and p.instruments && coalesce(post.needed_instruments, array[post.needed_role])
      and not exists (select 1 from public.blocks b where (b.blocker_id = post.author_id and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = post.author_id))
      and not exists (select 1 from public.connections c where least(c.from_id, c.to_id) = least(post.author_id, p.id) and greatest(c.from_id, c.to_id) = greatest(post.author_id, p.id))
  ),
  near as (
    select e.* from eligible e
    where e.mi <= coalesce(post.radius_mi, (select radius_mi from public.profiles where id = post.author_id), 25)
  ),
  ranked as (
    select n.id, n.mi,
      (post.offered_role is not null and (
         coalesce(post.offered_role = any (n.alert_roles), false)
         or exists (select 1 from public.board_posts o where o.author_id = n.id and o.needed_role = post.offered_role and o.status = 'open' and o.expires_at > now())
      )) as recip,
      array(select d from unnest(post.rehearsal_days) d where d = any (n.play_days) order by array_position(array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], d)) as days,
      (select count(*)::integer from public.influences a join public.influences b on b.artist_id = a.artist_id
        where a.profile_id = post.author_id and b.profile_id = n.id) as artists
    from near n
  )
  select r.id, r.mi, r.recip, r.days, r.artists, 'ok'::text
  from ranked r
  order by r.recip desc, cardinality(r.days) desc, r.artists desc, r.mi asc, r.id
  limit greatest(1, least(coalesce(p_limit, 5), 20));

  get diagnostics n = row_count;
  -- Zero-supply requests are measurable: each look records how many people there were.
  insert into public.opening_supply as s (post_id, candidates, checked_at) values (p_post, n, now())
  on conflict on constraint opening_supply_pkey do update set candidates = excluded.candidates, checked_at = excluded.checked_at;
end;
$$;

-- 4) Who to alert when an opening opens or is renewed ---------------------------------------
-- Same eligibility from the other side, minus anyone alerted about any opening 3+ times this week.
create or replace function public.opening_alert_targets(p_post bigint, p_limit integer default 25)
returns table (profile_id uuid, miles integer)
language sql stable security definer set search_path = public as $$
  with post as (select * from public.board_posts where id = p_post and needed_role is not null and status = 'open' and expires_at > now()),
  here as (select l.* from public.profile_locations l join post on l.profile_id = post.author_id)
  select p.id, greatest(1, round(3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - here.lat) / 2), 2)
        + cos(radians(here.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - here.lng) / 2), 2)))))::integer as mi
  from post, here, public.profiles p
  join public.profile_locations l on l.profile_id = p.id
  where p.onboarded_at is not null and p.last_active_at > now() - interval '60 days'
    and p.id <> post.author_id
    and p.instruments && coalesce(post.needed_instruments, array[post.needed_role])
    and not exists (select 1 from public.blocks b where (b.blocker_id = post.author_id and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = post.author_id))
    and not exists (select 1 from public.connections c where least(c.from_id, c.to_id) = least(post.author_id, p.id) and greatest(c.from_id, c.to_id) = greatest(post.author_id, p.id))
    and (select count(*) from public.notification_intents i where i.recipient_id = p.id and i.event_key like 'opening:%' and i.created_at > now() - interval '7 days') < 3
    and 3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - here.lat) / 2), 2)
        + cos(radians(here.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - here.lng) / 2), 2)))
      <= least(coalesce(post.radius_mi, 25), p.radius_mi)
  order by mi, p.id
  limit greatest(1, least(p_limit, 100));
$$;

-- Queue alerts for openings opened or renewed since they were last queued. One intent per
-- opening, renewal and recipient, so a retry never alerts twice.
create or replace function public.queue_opening_alerts()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  post record;
  total integer := 0;
  n integer;
begin
  for post in
    select p.id, p.author_id, coalesce(p.renewed_at, p.created_at) as since
    from public.board_posts p
    where p.needed_role is not null and p.status = 'open' and p.expires_at > now()
      and coalesce(p.renewed_at, p.created_at) > now() - interval '2 days'
  loop
    insert into public.notification_intents (event_key, recipient_id, payload)
    select 'opening:' || post.id || ':' || extract(epoch from post.since)::bigint, t.profile_id,
      jsonb_build_object('kind', 'opening', 'post_id', post.id, 'author_id', post.author_id, 'miles', t.miles)
    from public.opening_alert_targets(post.id) t
    on conflict (event_key, recipient_id, channel) do nothing;
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  return total;
end;
$$;

-- 5) Pulse: local supply and zero-supply requests -------------------------------------------
create or replace function public.opening_pulse()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_pulse() then return null; end if;
  return jsonb_build_object(
    'open', (select count(*) from public.board_posts where needed_role is not null and status = 'open' and expires_at > now()),
    'opened_28d', (select count(*) from public.opening_events where event = 'opened' and at > now() - interval '28 days'),
    'filled_28d', (select count(*) from public.opening_events where event = 'filled' and at > now() - interval '28 days'),
    'expired_28d', (select count(*) from public.opening_events where event = 'expired' and at > now() - interval '28 days'),
    'checked', (select count(*) from public.opening_supply s join public.board_posts p on p.id = s.post_id where p.status = 'open'),
    'zero_supply', (select count(*) from public.opening_supply s join public.board_posts p on p.id = s.post_id where p.status = 'open' and s.candidates = 0),
    'by_role', coalesce((select jsonb_object_agg(needed_role, jsonb_build_object('open', n, 'zero', z)) from (
      select p.needed_role, count(*) n, count(*) filter (where s.candidates = 0) z
      from public.board_posts p left join public.opening_supply s on s.post_id = p.id
      where p.needed_role is not null and p.status = 'open' and p.expires_at > now() group by p.needed_role) t), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.can_manage_post(bigint) from public, anon;
revoke all on function public.set_opening_status(bigint, text) from public, anon;
revoke all on function public.renew_opening(bigint, integer) from public, anon;
revoke all on function public.expire_openings() from public, anon, authenticated;
revoke all on function public.opening_candidates(bigint, integer) from public, anon;
revoke all on function public.opening_alert_targets(bigint, integer) from public, anon, authenticated;
revoke all on function public.queue_opening_alerts() from public, anon, authenticated;
revoke all on function public.opening_pulse() from public, anon;
grant execute on function public.can_manage_post(bigint) to authenticated;
grant execute on function public.set_opening_status(bigint, text) to authenticated;
grant execute on function public.renew_opening(bigint, integer) to authenticated;
grant execute on function public.opening_candidates(bigint, integer) to authenticated;
grant execute on function public.opening_pulse() to authenticated;
grant execute on function public.expire_openings() to service_role;
grant execute on function public.opening_alert_targets(bigint, integer) to service_role;
grant execute on function public.queue_opening_alerts() to service_role;

-- 6) Today: local, eligible people first, before any limit -----------------------------------
-- The old Today read the 200 most recently active people anywhere, then filtered by distance,
-- so 200 newer accounts in another city could crowd out everyone nearby. This filters first.
create or replace function public.local_candidates(p_limit integer default 60)
returns table (profile_id uuid, miles integer)
language sql stable security definer set search_path = public as $$
  with me as (select p.id, p.radius_mi, l.lat, l.lng from public.profiles p join public.profile_locations l on l.profile_id = p.id where p.id = auth.uid())
  select p.id, greatest(1, round(3958.8 * 2 * asin(sqrt(
        power(sin(radians(l.lat - me.lat) / 2), 2)
        + cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2)))))::integer
  from me, public.profiles p
  join public.profile_locations l on l.profile_id = p.id
  where p.onboarded_at is not null and p.last_active_at > now() - interval '60 days'
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
