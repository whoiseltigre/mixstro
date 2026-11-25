-- Handoff PR 3: messages that never get lost or doubled, an inbox that reads the latest
-- message per conversation, signup that saves all at once, "Another time" in one step, and a
-- durable record of each message notification. Safe to run more than once, and compatible
-- with the app version that is live now (every new column is optional).

-- 1) Send ids ----------------------------------------------------------------------------
-- The app gives each send a random id that stays the same when it retries. The database keeps
-- one row per (conversation, sender, send id), so a retry after a lost answer can't double a
-- message, while two sends of the same words on purpose are two messages. Older rows and older
-- app versions simply have no send id.
alter table public.messages add column if not exists client_id uuid;
create unique index if not exists messages_client_id_key on public.messages (connection_id, sender_id, client_id) where client_id is not null;
create index if not exists messages_conn_newest_idx on public.messages (connection_id, created_at desc, id desc);

alter table public.band_messages add column if not exists client_id uuid;
create unique index if not exists band_messages_client_id_key on public.band_messages (band_id, sender_id, client_id) where client_id is not null;
create index if not exists band_messages_newest_idx on public.band_messages (band_id, created_at desc, id desc);

-- 2) Inbox: the newest message in each of your conversations ------------------------------
-- Runs as the caller, so row-level security decides which conversations count. Replaces a
-- capped scan of recent messages, where one busy chat could push a quiet one out of view.
create or replace function public.latest_messages(p_connections bigint[])
returns table (connection_id bigint, sender_id uuid, body text, voice_url text, created_at timestamptz, id bigint)
language sql stable security invoker set search_path = public as $$
  select distinct on (m.connection_id) m.connection_id, m.sender_id, m.body, m.voice_url, m.created_at, m.id
  from public.messages m
  where m.connection_id = any (p_connections)
  order by m.connection_id, m.created_at desc, m.id desc;
$$;
revoke all on function public.latest_messages(bigint[]) from public, anon;
grant execute on function public.latest_messages(bigint[]) to authenticated, service_role;

-- 3) Finish signup in one transaction ---------------------------------------------------------
-- The profile, influences and clips commit together, and only then is the profile marked as
-- onboarded. If anything fails, nothing changes and the earlier profile (if any) stays as it was.
-- Runs as the caller: the usual row-level security applies to every write.
create or replace function public.finish_onboarding(p_profile jsonb, p_influences jsonb, p_clips jsonb default null)
returns void language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_influences) <> 'array' or jsonb_array_length(p_influences) > 30 then raise exception 'invalid influences'; end if;
  if p_clips is not null and (jsonb_typeof(p_clips) <> 'array' or jsonb_array_length(p_clips) > 12) then raise exception 'invalid clips'; end if;

  insert into public.profiles (id, first_name, username, adult_confirmed_at, avatar_url, instruments, main_instrument, level,
    genres, music_source, goals, commitment, neighborhood, radius_mi, play_days)
  values (
    me,
    p_profile->>'first_name',
    p_profile->>'username',
    (p_profile->>'adult_confirmed_at')::timestamptz,
    p_profile->>'avatar_url',
    coalesce(array(select jsonb_array_elements_text(p_profile->'instruments')), '{}'),
    p_profile->>'main_instrument',
    p_profile->>'level',
    coalesce(array(select jsonb_array_elements_text(p_profile->'genres')), '{}'),
    p_profile->>'music_source',
    coalesce(array(select jsonb_array_elements_text(p_profile->'goals')), '{}'),
    coalesce((p_profile->>'commitment')::smallint, 1),
    p_profile->>'neighborhood',
    coalesce((p_profile->>'radius_mi')::smallint, 25),
    coalesce(array(select jsonb_array_elements_text(p_profile->'play_days')), '{}')
  )
  on conflict (id) do update set
    first_name = excluded.first_name, username = excluded.username,
    adult_confirmed_at = coalesce(excluded.adult_confirmed_at, profiles.adult_confirmed_at),
    avatar_url = excluded.avatar_url, instruments = excluded.instruments, main_instrument = excluded.main_instrument,
    level = excluded.level, genres = excluded.genres, music_source = excluded.music_source, goals = excluded.goals,
    commitment = excluded.commitment, neighborhood = excluded.neighborhood, radius_mi = excluded.radius_mi,
    play_days = excluded.play_days;

  delete from public.influences where profile_id = me;
  insert into public.influences (profile_id, artist_id, artist_name, image_url, source, rank)
  select me, i->>'artist_id', i->>'artist_name', i->>'image_url', coalesce(i->>'source', 'manual'), (ord - 1)::smallint
  from jsonb_array_elements(p_influences) with ordinality as t(i, ord);

  -- Null keeps the clips you have; an array replaces them all at once.
  if p_clips is not null and jsonb_array_length(p_clips) > 0 then
    delete from public.clips where profile_id = me;
    insert into public.clips (profile_id, kind, provider, url)
    select me, c->>'kind', c->>'provider', c->>'url' from jsonb_array_elements(p_clips) c;
  end if;

  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = me;
end;
$$;
revoke all on function public.finish_onboarding(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.finish_onboarding(jsonb, jsonb, jsonb) to authenticated;

-- 4) "Another time": replace the old invite and propose the new one together -----------------
-- Runs as the caller, so the existing jam policies decide who may do each half. If either half
-- is refused, neither happens and the original invite stays.
create or replace function public.reschedule_jam(p_replaces bigint, p_starts_at timestamptz, p_place text, p_note text default null)
returns bigint language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
  old public.jams;
  new_id bigint;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into old from public.jams where id = p_replaces for update;
  if not found or old.status <> 'proposed' or old.proposed_by = me then raise exception 'That invite was already answered.'; end if;
  update public.jams set status = 'replaced' where id = p_replaces and status = 'proposed';
  if not found then raise exception 'That invite was already answered.'; end if;
  insert into public.jams (connection_id, proposed_by, starts_at, place, note, replaces_id)
  values (old.connection_id, me, p_starts_at, p_place, nullif(trim(coalesce(p_note, '')), ''), p_replaces)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.reschedule_jam(bigint, timestamptz, text, text) from public, anon;
grant execute on function public.reschedule_jam(bigint, timestamptz, text, text) to authenticated;

-- 5) Durable notification intents ------------------------------------------------------------
-- Written in the same transaction as the message, one per (event, recipient, channel), so a
-- notification can't be lost when the server stops right after a send, or sent twice when two
-- workers race. The app sends right away and marks it; the 15-minute job drains anything left.
create table if not exists public.notification_intents (
  id bigint generated always as identity primary key,
  event_key text not null,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null default 'any',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0,
  next_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  unique (event_key, recipient_id, channel)
);
create index if not exists notification_intents_due_idx on public.notification_intents (next_at) where status in ('pending', 'sending');
alter table public.notification_intents enable row level security;
revoke all on public.notification_intents from anon, authenticated;

create or replace function public.message_notification_intent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  select case when c.from_id = new.sender_id then c.to_id else c.from_id end into other
  from public.connections c where c.id = new.connection_id;
  if other is not null then
    insert into public.notification_intents (event_key, recipient_id, payload)
    values ('message:' || new.id, other, jsonb_build_object('kind', 'message', 'message_id', new.id, 'connection_id', new.connection_id, 'sender_id', new.sender_id))
    on conflict (event_key, recipient_id, channel) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.message_notification_intent() from public, anon, authenticated;
drop trigger if exists messages_notification_intent on public.messages;
create trigger messages_notification_intent after insert on public.messages
  for each row execute function public.message_notification_intent();

-- Claim due intents (or one by key). A claim that's been "sending" for 10 minutes is treated as
-- abandoned and can be claimed again. SKIP LOCKED lets several workers run at once.
create or replace function public.claim_notification_intents(p_limit integer default 50, p_key text default null)
returns setof public.notification_intents language plpgsql volatile security definer set search_path = public as $$
begin
  return query
  update public.notification_intents n set status = 'sending', claimed_at = now(), attempts = n.attempts + 1
  where n.id in (
    select i.id from public.notification_intents i
    where (p_key is null or i.event_key = p_key)
      and i.next_at <= now()
      and (i.status = 'pending' or (i.status = 'sending' and i.claimed_at < now() - interval '10 minutes'))
    order by i.next_at, i.id
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  )
  returning n.*;
end;
$$;

-- Record the outcome. Failures back off (1, 4, 9, … minutes) and stop after 6 attempts.
create or replace function public.finish_notification_intent(p_id bigint, p_status text, p_error text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_status in ('sent', 'skipped') then
    update public.notification_intents set status = p_status, done_at = now(), last_error = null where id = p_id;
  else
    update public.notification_intents set
      status = case when attempts >= 6 then 'failed' else 'pending' end,
      next_at = now() + make_interval(mins => attempts * attempts),
      last_error = left(p_error, 300)
    where id = p_id;
  end if;
end;
$$;

-- For Pulse/ops: backlog age, retries and terminal failures.
create or replace function public.notification_intent_health()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pending', count(*) filter (where status in ('pending', 'sending')),
    'oldest_pending_minutes', coalesce(extract(epoch from now() - min(created_at) filter (where status in ('pending', 'sending'))) / 60, 0)::int,
    'retrying', count(*) filter (where status = 'pending' and attempts > 0),
    'failed_7d', count(*) filter (where status = 'failed' and created_at > now() - interval '7 days'),
    'sent_7d', count(*) filter (where status = 'sent' and created_at > now() - interval '7 days')
  ) from public.notification_intents;
$$;

revoke all on function public.claim_notification_intents(integer, text) from public, anon, authenticated;
revoke all on function public.finish_notification_intent(bigint, text, text) from public, anon, authenticated;
revoke all on function public.notification_intent_health() from public, anon, authenticated;
grant execute on function public.claim_notification_intents(integer, text) to service_role;
grant execute on function public.finish_notification_intent(bigint, text, text) to service_role;
grant execute on function public.notification_intent_health() to service_role;
