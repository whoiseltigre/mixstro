-- Safety fixes from the CTO audit (items 01 to 04), in one file. Safe to run more than once.
--
-- 1) Connections: the database itself enforces consent. Requests, accepts, declines and
--    passes go through narrow functions; any direct write from the app is checked by a
--    trigger so it can only make the same moves. One relationship per pair of people.
-- 2) Account deletion: a durable record per request, plus server-only helpers that find
--    every file a person left behind (clips, photos, DM and band voice notes).
-- 3) Privacy: distances only for profiles you can see, and the block check can't be used to
--    ask about two other people. Functions that should never be called signed-out aren't.
-- 4) Push: only real push services (Apple, Google, Mozilla, Microsoft) and well-formed keys
--    can be saved, at most 10 devices per person, and only through the save function.
--
-- Works with the app version that is live now as well as the new one, so it can run first.

-- 1) Connections -------------------------------------------------------------------------

-- 1a) One relationship per pair. Older data could hold a row in each direction (a pass one
-- way, a request the other). Keep the most advanced row (accepted, then pending, then
-- declined, then passed; the oldest on a tie), move any chat and jams onto it, drop the rest.
-- Two crossed pending requests mean both people asked, so that pair becomes connected.
do $$
declare
  r record;
begin
  for r in
    with ranked as (
      select c.id, c.status,
        first_value(c.id) over w as keep_id,
        row_number() over w as rn,
        count(*) filter (where c.status = 'pending') over (partition by least(c.from_id, c.to_id), greatest(c.from_id, c.to_id)) as pending_n
      from public.connections c
      window w as (
        partition by least(c.from_id, c.to_id), greatest(c.from_id, c.to_id)
        order by case c.status when 'accepted' then 0 when 'pending' then 1 when 'declined' then 2 else 3 end, c.id
      )
    )
    select id, keep_id, status, pending_n from ranked where rn > 1
  loop
    if exists (select 1 from public.messages where connection_id = r.id) then
      -- Voice note paths name their old conversation; let them move with the chat.
      alter table public.messages drop constraint if exists messages_voice_path;
      update public.messages set connection_id = r.keep_id where connection_id = r.id;
    end if;
    update public.jams set connection_id = r.keep_id where connection_id = r.id;
    delete from public.connections where id = r.id;
    if r.status = 'pending' and r.pending_n > 1 then
      update public.connections set status = 'accepted' where id = r.keep_id and status = 'pending';
    end if;
  end loop;
end $$;

alter table public.messages drop constraint if exists messages_voice_path;
alter table public.messages add constraint messages_voice_path
  check (voice_url is null or voice_url like (connection_id::text || '/' || sender_id::text || '/%')) not valid;

create unique index if not exists connections_one_per_pair
  on public.connections (least(from_id, to_id), greatest(from_id, to_id));

-- 1b) The rules for asking someone: they finished signing up, neither blocked the other, and
-- you either wrote a short note and have at least one song up, or answered their Board post.
create or replace function public.connection_request_ok(p_from uuid, p_to uuid, p_note text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_from is null then raise exception 'sign in first'; end if;
  if p_to is null or p_to = p_from
     or not exists (select 1 from public.profiles where id = p_to and onboarded_at is not null)
     or public.is_blocked(p_from, p_to) then
    raise exception 'not available';
  end if;
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

-- 1c) Guard on every direct write from the app (the signed-in roles). It runs as the caller:
-- the functions below run as the database owner and do their own checks, so it lets them
-- through, and so does the server's service role.
create or replace function public.connections_guard()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if me is null or new.from_id is distinct from me then raise exception 'you can only ask for yourself'; end if;
    if new.status not in ('pending', 'passed') then raise exception 'a new connection starts as a request'; end if;
    new.created_at := now();
    new.accepted_at := null;
    if new.status = 'passed' then
      new.note := null;
    else
      new.note := nullif(left(regexp_replace(trim(coalesce(new.note, '')), '\s+', ' ', 'g'), 280), '');
      perform public.connection_request_ok(me, new.to_id, new.note);
    end if;
    return new;
  end if;
  -- UPDATE: only the person asked can answer, only once, and only the answer changes.
  if new.id <> old.id or new.from_id <> old.from_id or new.to_id <> old.to_id
     or new.note is distinct from old.note or new.created_at <> old.created_at then
    raise exception 'only the answer can change';
  end if;
  if new.status = old.status then return new; end if;
  if me is null or old.to_id <> me then raise exception 'only the person asked can answer'; end if;
  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then raise exception 'that request is not open'; end if;
  if new.status = 'accepted' and public.is_blocked(old.from_id, old.to_id) then raise exception 'not available'; end if;
  return new;
end;
$$;
revoke all on function public.connections_guard() from public, anon, authenticated;

drop trigger if exists connections_guard on public.connections;
create trigger connections_guard before insert or update on public.connections
  for each row execute function public.connections_guard();

-- Never deleted from the app (passes and declines stay so Today remembers them).
revoke delete on public.connections from anon, authenticated;
revoke insert, update on public.connections from anon;

-- 1d) The three moves. Each locks the pair, so two people asking at once end up connected
-- once instead of twice. Outcomes: sent, accepted (they had asked you: now connected),
-- connected (already), pending (already asked), declined (they said no), passed, closed.
create or replace function public.request_connection(p_to uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  txt text := nullif(left(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), 280), '');
  c public.connections;
  had boolean;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_to is null or p_to = me or public.is_blocked(me, p_to) then raise exception 'not available'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me, p_to)::text || greatest(me, p_to)::text, 0));
  select * into c from public.connections
    where (from_id = me and to_id = p_to) or (from_id = p_to and to_id = me) for update;
  had := found;

  if had and c.status = 'accepted' then return jsonb_build_object('outcome', 'connected', 'id', c.id); end if;
  if had and c.status = 'pending' and c.to_id = me then
    -- They asked you first: saying yes is the answer. Your note follows theirs in the chat.
    update public.connections set status = 'accepted' where id = c.id;
    if txt is not null then
      insert into public.messages (connection_id, sender_id, body) values (c.id, me, txt);
    end if;
    return jsonb_build_object('outcome', 'accepted', 'id', c.id);
  end if;
  if had and c.status = 'pending' then return jsonb_build_object('outcome', 'pending', 'id', c.id); end if;
  if had and c.status = 'declined' and c.from_id = me then return jsonb_build_object('outcome', 'declined', 'id', c.id); end if;

  perform public.connection_request_ok(me, p_to, txt);
  if had then
    -- Your earlier pass, or their pass or your decline: it becomes a fresh request from you.
    update public.connections
      set from_id = me, to_id = p_to, status = 'pending', note = txt, created_at = now(), accepted_at = null
      where id = c.id;
    return jsonb_build_object('outcome', 'sent', 'id', c.id);
  end if;
  insert into public.connections (from_id, to_id, status, note) values (me, p_to, 'pending', txt) returning * into c;
  return jsonb_build_object('outcome', 'sent', 'id', c.id);
end;
$$;

create or replace function public.answer_connection(p_from uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.connections;
begin
  if me is null then raise exception 'sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me, p_from)::text || greatest(me, p_from)::text, 0));
  select * into c from public.connections where from_id = p_from and to_id = me for update;
  if not found or c.status <> 'pending' then return jsonb_build_object('outcome', 'closed'); end if;
  if p_accept and public.is_blocked(me, p_from) then raise exception 'not available'; end if;
  update public.connections set status = case when p_accept then 'accepted' else 'declined' end where id = c.id;
  return jsonb_build_object('outcome', case when p_accept then 'accepted' else 'declined' end, 'id', c.id);
end;
$$;

create or replace function public.pass_connection(p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.connections;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_other is null or p_other = me then return jsonb_build_object('outcome', 'closed'); end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me, p_other)::text || greatest(me, p_other)::text, 0));
  select * into c from public.connections
    where (from_id = me and to_id = p_other) or (from_id = p_other and to_id = me) for update;
  if not found then
    insert into public.connections (from_id, to_id, status) values (me, p_other, 'passed');
    return jsonb_build_object('outcome', 'passed');
  end if;
  if c.to_id = me and c.status = 'pending' then
    update public.connections set status = 'declined' where id = c.id;
    return jsonb_build_object('outcome', 'declined', 'id', c.id);
  end if;
  return jsonb_build_object('outcome', 'closed', 'id', c.id);
end;
$$;

revoke all on function public.request_connection(uuid, text) from public, anon;
revoke all on function public.answer_connection(uuid, boolean) from public, anon;
revoke all on function public.pass_connection(uuid) from public, anon;
grant execute on function public.request_connection(uuid, text) to authenticated;
grant execute on function public.answer_connection(uuid, boolean) to authenticated;
grant execute on function public.pass_connection(uuid) to authenticated;

-- 2) Account deletion --------------------------------------------------------------------

-- One row per request. No link to the profile, so it outlives the account and shows the
-- deletion finished. Only the server (service role) reads or writes it.
create table if not exists public.account_deletions (
  profile_id uuid primary key,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from anon, authenticated;

-- Every stored file to remove for a person, a page at a time: their clips and photos, their
-- voice notes in DMs and bands, and the other person's voice notes in chats with them (those
-- chats go when the account does). Band photos they uploaded stay with the band.
create or replace function public.account_files(p_uid uuid, p_limit integer default 500)
returns table (bucket_id text, name text)
language sql stable security definer set search_path = public, storage as $$
  select o.bucket_id, o.name
  from storage.objects o
  where not (o.bucket_id = 'avatars' and o.name like p_uid::text || '/bands/%')
    and (
      (o.bucket_id in ('clips', 'avatars') and (storage.foldername(o.name))[1] = p_uid::text)
      or (o.bucket_id = 'voice' and (storage.foldername(o.name))[2] = p_uid::text)
      or (o.bucket_id = 'voice' and (storage.foldername(o.name))[1] in (
            select c.id::text from public.connections c where p_uid in (c.from_id, c.to_id)))
      or o.owner_id = p_uid::text
    )
  order by o.bucket_id, o.name
  limit greatest(1, least(p_limit, 1000));
$$;

-- Files that stay (band photos) no longer belong to the account, so Auth can delete it.
create or replace function public.release_account_files(p_uid uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
begin
  update storage.objects set owner = null, owner_id = null where owner_id = p_uid::text or owner = p_uid;
end;
$$;

revoke all on function public.account_files(uuid, integer) from public, anon, authenticated;
revoke all on function public.release_account_files(uuid) from public, anon, authenticated;
grant execute on function public.account_files(uuid, integer) to service_role;
grant execute on function public.release_account_files(uuid) to service_role;

-- The old one-step delete skipped voice notes; the app now deletes through the server.
revoke all on function public.delete_my_account() from public, anon, authenticated;

-- 3) Privacy -----------------------------------------------------------------------------

-- The block check answers only about yourself: a signed-in person asking about two other
-- people, or a signed-out visitor asking at all, gets "no". The server and the database's
-- own functions get the real answer.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is not null and auth.uid() <> a and auth.uid() <> b then false
    when auth.uid() is null and coalesce(auth.role(), '') in ('anon', 'authenticated') then false
    else exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
    )
  end;
$$;
revoke all on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated, service_role;

-- Distances only to people you could see: signed up, not blocked either way, and active in
-- the last 60 days unless you're already connected.
create or replace function public.distances_from_me(ids uuid[])
returns table (profile_id uuid, miles integer)
language sql stable security definer set search_path = public as $$
  select o.profile_id,
    greatest(1, round(3958.8 * 2 * asin(sqrt(
      power(sin(radians(o.lat - me.lat) / 2), 2)
      + cos(radians(me.lat)) * cos(radians(o.lat)) * power(sin(radians(o.lng - me.lng) / 2), 2)
    ))))::integer
  from public.profile_locations me
  join public.profile_locations o on o.profile_id = any (ids) and o.profile_id <> me.profile_id
  join public.profiles p on p.id = o.profile_id and p.onboarded_at is not null
  where me.profile_id = auth.uid()
    and not public.is_blocked(me.profile_id, o.profile_id)
    and (
      p.last_active_at > now() - interval '60 days'
      or exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and ((c.from_id = me.profile_id and c.to_id = o.profile_id) or (c.from_id = o.profile_id and c.to_id = me.profile_id))
      )
    );
$$;
revoke all on function public.distances_from_me(uuid[]) from public, anon;
grant execute on function public.distances_from_me(uuid[]) to authenticated;

-- Signed-out visitors can't call anything meant for members. Supabase grants every new
-- function to anon by default, and "revoke from public" doesn't undo that, so say it plainly.
-- The public page functions (public_profile, public_band, band_invite, played_with,
-- sitemap_entries) keep their signed-out access.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'verified_since', 'profiles_set_verified', 'identities_touch_profile', 'touch_last_active',
        'in_connection', 'jam_outcomes', 'invite_to_band', 'accept_band_invite', 'decline_band_invite',
        'connected_ids', 'mutual_connections', 'people_you_may_know', 'pmf_pulse', 'pmf_survey_due',
        'can_view_pulse', 'connection_note_to_chat', 'is_band_member', 'update_band', 'start_band',
        'confirm_shared_bill', 'board_post_band_check', 'mark_band_read', 'send_band_note',
        'band_chat_on_reply', 'band_chat_on_show', 'band_chat_on_join', 'band_folder_member',
        'my_bands', 'band_bills_to_confirm', 'browse_bands', 'my_board_reply_counts',
        'jams_lock_details', 'highlights_limit', 'stamp_connection_accepted'
      )
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;

-- Trigger and internal helpers aren't for calling directly by anyone.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('verified_since', 'profiles_set_verified', 'identities_touch_profile',
        'connection_note_to_chat', 'board_post_band_check', 'band_chat_on_reply', 'band_chat_on_show',
        'band_chat_on_join', 'connected_ids', 'jams_lock_details', 'highlights_limit', 'stamp_connection_accepted')
  loop
    execute format('revoke execute on function %s from authenticated', f.sig);
  end loop;
end $$;

-- New functions start private; each one grants what it needs.
alter default privileges in schema public revoke execute on functions from public, anon;

-- 4) Push --------------------------------------------------------------------------------

create or replace function public.push_endpoint_ok(e text)
returns boolean language sql immutable set search_path = public as $$
  select e is not null and char_length(e) <= 1024
    and e ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$';
$$;

delete from public.push_subscriptions
  where not public.push_endpoint_ok(endpoint)
     or p256dh !~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
     or auth !~ '^[A-Za-z0-9_-]{16,32}={0,2}$';

alter table public.push_subscriptions drop constraint if exists push_subscriptions_valid;
alter table public.push_subscriptions add constraint push_subscriptions_valid check (
  public.push_endpoint_ok(endpoint)
  and p256dh ~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
  and auth ~ '^[A-Za-z0-9_-]{16,32}={0,2}$'
);

-- People can see and remove their own devices; adding one goes through the save function.
drop policy if exists "own push subscriptions" on public.push_subscriptions;
drop policy if exists "see own push subscriptions" on public.push_subscriptions;
drop policy if exists "remove own push subscriptions" on public.push_subscriptions;
create policy "see own push subscriptions" on public.push_subscriptions for select to authenticated
  using (profile_id = auth.uid());
create policy "remove own push subscriptions" on public.push_subscriptions for delete to authenticated
  using (profile_id = auth.uid());
revoke insert, update on public.push_subscriptions from anon, authenticated;

-- A device that changes hands moves to whoever is signed in now. Keeps the 10 newest per person.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  if not public.push_endpoint_ok(p_endpoint)
     or coalesce(p_p256dh, '') !~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
     or coalesce(p_auth, '') !~ '^[A-Za-z0-9_-]{16,32}={0,2}$' then
    raise exception 'unsupported push subscription';
  end if;
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = me, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
  delete from public.push_subscriptions
  where profile_id = me and id not in (
    select id from public.push_subscriptions where profile_id = me order by created_at desc, id desc limit 10
  );
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
