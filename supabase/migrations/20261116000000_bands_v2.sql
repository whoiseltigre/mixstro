-- Bands v2: a band's own page details, shows, open spots, a band chat, and finding bands.
--
-- Still no owner: every CURRENT member (their project in the band has no end year) can edit
-- the band, add shows, post open spots and use the band chat. Past members stay on the page.

-- 1. The band's own details ---------------------------------------------------------------

alter table public.bands
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists genres text[] not null default '{}',
  add column if not exists status text not null default 'active',
  add column if not exists photo_url text,
  add column if not exists updated_at timestamptz;

alter table public.bands drop constraint if exists bands_details;
alter table public.bands add constraint bands_details check (
  (bio is null or char_length(bio) <= 600)
  and (city is null or char_length(city) <= 80)
  and cardinality(genres) <= 5
  and status in ('active', 'recording', 'break', 'done')
  and (photo_url is null or char_length(photo_url) <= 500)
);

-- When you last opened the band chat, for unread counts.
alter table public.band_members add column if not exists last_read_at timestamptz;

-- Plays in the band now (the project in it has no end year).
create or replace function public.is_band_member(p_band bigint, p_who uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.band_members bm join public.projects pr on pr.id = bm.project_id
    where bm.band_id = p_band and bm.profile_id = p_who and pr.end_year is null
  );
$$;

-- Edit the band's page. Photos must be in our own public "avatars" bucket.
create or replace function public.update_band(
  p_band bigint, p_bio text, p_city text, p_genres text[], p_status text, p_photo_url text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_band_member(p_band) then raise exception 'not in this band'; end if;
  if p_photo_url is not null and p_photo_url !~ '^https://[a-z0-9.-]+/storage/v1/object/public/avatars/' then
    raise exception 'bad photo';
  end if;
  update public.bands set
    bio = nullif(left(trim(coalesce(p_bio, '')), 600), ''),
    city = nullif(left(trim(coalesce(p_city, '')), 80), ''),
    genres = coalesce((select array_agg(left(trim(g), 30)) from unnest(p_genres[1:5]) g where trim(g) <> ''), '{}'),
    status = case when p_status in ('active', 'recording', 'break', 'done') then p_status else status end,
    photo_url = p_photo_url,
    updated_at = now()
  where id = p_band;
end $$;

-- 2. Shows ----------------------------------------------------------------------------------

create table if not exists public.band_shows (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  show_date date not null,
  show_time text check (show_time is null or char_length(show_time) <= 20),
  venue text not null check (char_length(venue) between 2 and 80),
  city text check (city is null or char_length(city) <= 80),
  ticket_url text check (ticket_url is null or (char_length(ticket_url) <= 500 and ticket_url ~ '^https?://')),
  -- Other acts on the bill that aren't on Mixstro: "with Soft Static".
  with_text text check (with_text is null or char_length(with_text) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists band_shows_band_idx on public.band_shows (band_id, show_date);

-- Mixstro bands that shared the bill. Shows on both pages once the other band confirms.
create table if not exists public.band_show_bands (
  show_id bigint not null references public.band_shows (id) on delete cascade,
  band_id bigint not null references public.bands (id) on delete cascade,
  confirmed_at timestamptz,
  primary key (show_id, band_id)
);
create index if not exists band_show_bands_band_idx on public.band_show_bands (band_id);

alter table public.band_shows enable row level security;
alter table public.band_show_bands enable row level security;

drop policy if exists "read shows" on public.band_shows;
create policy "read shows" on public.band_shows for select to authenticated using (true);
drop policy if exists "members add shows" on public.band_shows;
create policy "members add shows" on public.band_shows for insert to authenticated
  with check (added_by = auth.uid() and public.is_band_member(band_id));
drop policy if exists "members edit shows" on public.band_shows;
create policy "members edit shows" on public.band_shows for update to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id));
drop policy if exists "members remove shows" on public.band_shows;
create policy "members remove shows" on public.band_shows for delete to authenticated
  using (public.is_band_member(band_id));

drop policy if exists "read shared bills" on public.band_show_bands;
create policy "read shared bills" on public.band_show_bands for select to authenticated using (true);
-- Tag another band on your own show (never your own band, never pre-confirmed).
drop policy if exists "tag a band on your show" on public.band_show_bands;
create policy "tag a band on your show" on public.band_show_bands for insert to authenticated with check (
  confirmed_at is null
  and exists (select 1 from public.band_shows s where s.id = show_id and s.band_id <> band_show_bands.band_id and public.is_band_member(s.band_id))
);
-- Either band can take the tag off.
drop policy if exists "untag a shared bill" on public.band_show_bands;
create policy "untag a shared bill" on public.band_show_bands for delete to authenticated using (
  public.is_band_member(band_id)
  or exists (select 1 from public.band_shows s where s.id = show_id and public.is_band_member(s.band_id))
);

-- The tagged band says "yes, we played that one".
create or replace function public.confirm_shared_bill(p_show bigint, p_band bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_band_member(p_band) then raise exception 'not in this band'; end if;
  update public.band_show_bands set confirmed_at = now() where show_id = p_show and band_id = p_band and confirmed_at is null;
end $$;

-- 3. Open spots: a Board post made for a band -----------------------------------------------

alter table public.board_posts add column if not exists band_id bigint references public.bands (id) on delete set null;
create index if not exists board_posts_band_idx on public.board_posts (band_id) where band_id is not null;

-- Only a current member can post for a band.
create or replace function public.board_post_band_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.band_id is not null and (tg_op = 'INSERT' or new.band_id is distinct from old.band_id)
     and not public.is_band_member(new.band_id, new.author_id) then
    raise exception 'not in this band';
  end if;
  return new;
end $$;
drop trigger if exists board_post_band_check on public.board_posts;
create trigger board_post_band_check before insert or update on public.board_posts
  for each row execute function public.board_post_band_check();

-- Everyone in the band sees who answered its open spot, not only the member who posted it.
drop policy if exists "read board replies" on public.board_replies;
create policy "read board replies" on public.board_replies for select to authenticated using (
  from_id = auth.uid()
  or exists (
    select 1 from public.board_posts p where p.id = post_id
      and (p.author_id = auth.uid() or (p.band_id is not null and public.is_band_member(p.band_id)))
  )
);

-- Any member can close the band's open spot.
drop policy if exists "members close band posts" on public.board_posts;
create policy "members close band posts" on public.board_posts for update to authenticated
  using (band_id is not null and public.is_band_member(band_id))
  with check (band_id is not null and public.is_band_member(band_id));

-- 4. Band chat ------------------------------------------------------------------------------

create table if not exists public.band_messages (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  -- Null for the band's own updates ("Maya confirmed her spot").
  sender_id uuid references public.profiles (id) on delete cascade,
  -- text and voice: members talking. note: someone outside the band writing to it.
  -- spot_reply, show, joined: updates the app posts.
  kind text not null default 'text' check (kind in ('text', 'voice', 'note', 'spot_reply', 'show', 'joined')),
  body text check (body is null or char_length(body) <= 4000),
  voice_url text,
  voice_seconds smallint check (voice_seconds is null or voice_seconds between 1 and 120),
  ref_id bigint,
  created_at timestamptz not null default now(),
  check (kind <> 'text' or body is not null),
  check (kind <> 'voice' or voice_url is not null),
  check (voice_url is null or voice_url like ('band-' || band_id::text || '/' || sender_id::text || '/%'))
);
create index if not exists band_messages_band_idx on public.band_messages (band_id, created_at);

alter table public.band_messages enable row level security;

drop policy if exists "members read band chat" on public.band_messages;
create policy "members read band chat" on public.band_messages for select to authenticated
  using (public.is_band_member(band_id));
drop policy if exists "members write band chat" on public.band_messages;
create policy "members write band chat" on public.band_messages for insert to authenticated
  with check (sender_id = auth.uid() and kind in ('text', 'voice') and ref_id is null and public.is_band_member(band_id));
drop policy if exists "delete own band messages" on public.band_messages;
create policy "delete own band messages" on public.band_messages for delete to authenticated
  using (sender_id = auth.uid() and kind in ('text', 'voice'));

do $$ begin
  alter publication supabase_realtime add table public.band_messages;
exception when duplicate_object then null; end $$;

-- Opening the chat marks it read.
create or replace function public.mark_band_read(p_band bigint)
returns void language sql security definer set search_path = public as $$
  update public.band_members set last_read_at = now() where band_id = p_band and profile_id = auth.uid();
$$;

-- Write to a band you're not in ("Message the band"). Lands in their chat as a card with your
-- profile. One note per band a day, 10 a day overall.
create or replace function public.send_band_note(p_band bigint, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  txt text := left(trim(coalesce(p_body, '')), 500);
begin
  if me is null then raise exception 'sign in first'; end if;
  if char_length(txt) < 2 then raise exception 'write something first'; end if;
  if not exists (select 1 from public.bands where id = p_band) then raise exception 'no such band'; end if;
  if public.is_band_member(p_band, me) then raise exception 'you are in this band'; end if;
  if exists (
    select 1 from public.band_members bm where bm.band_id = p_band and public.is_blocked(me, bm.profile_id)
  ) then raise exception 'not available'; end if;
  if exists (select 1 from public.band_messages where band_id = p_band and sender_id = me and kind = 'note' and created_at > now() - interval '1 day') then
    raise exception 'one note a day';
  end if;
  if (select count(*) from public.band_messages where sender_id = me and kind = 'note' and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many notes today';
  end if;
  insert into public.band_messages (band_id, sender_id, kind, body) values (p_band, me, 'note', txt);
end $$;

-- The app's own updates in the chat.
create or replace function public.band_chat_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare post public.board_posts;
begin
  select * into post from public.board_posts where id = new.post_id;
  if post.band_id is not null then
    insert into public.band_messages (band_id, sender_id, kind, body, ref_id)
    values (post.band_id, new.from_id, 'spot_reply', coalesce(post.role, post.title), new.post_id);
  end if;
  return new;
end $$;
drop trigger if exists band_chat_on_reply on public.board_replies;
create trigger band_chat_on_reply after insert on public.board_replies
  for each row execute function public.band_chat_on_reply();

create or replace function public.band_chat_on_show()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.band_messages (band_id, sender_id, kind, body, ref_id)
  values (new.band_id, null, 'show', new.venue, new.id);
  return new;
end $$;
drop trigger if exists band_chat_on_show on public.band_shows;
create trigger band_chat_on_show after insert on public.band_shows
  for each row execute function public.band_chat_on_show();

create or replace function public.band_chat_on_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- The first member starts the band; nobody to tell.
  if exists (select 1 from public.band_members where band_id = new.band_id and profile_id <> new.profile_id) then
    insert into public.band_messages (band_id, sender_id, kind) values (new.band_id, new.profile_id, 'joined');
  end if;
  return new;
end $$;
drop trigger if exists band_chat_on_join on public.band_members;
create trigger band_chat_on_join after insert on public.band_members
  for each row execute function public.band_chat_on_join();

-- Voice notes in the band chat live in the private "voice" bucket at band-<id>/<you>/<file>.
create or replace function public.band_folder_member(p_folder text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_folder is null or p_folder !~ '^band-[0-9]{1,18}$' then return false; end if;
  return public.is_band_member(substr(p_folder, 6)::bigint);
end $$;

drop policy if exists "send band voice notes" on storage.objects;
create policy "send band voice notes" on storage.objects for insert to authenticated with check (
  bucket_id = 'voice' and (storage.foldername(name))[2] = auth.uid()::text and public.band_folder_member((storage.foldername(name))[1])
);
drop policy if exists "hear band voice notes" on storage.objects;
create policy "hear band voice notes" on storage.objects for select to authenticated using (
  bucket_id = 'voice' and public.band_folder_member((storage.foldername(name))[1])
);

-- Your bands, with the latest chat line and how many you haven't read.
create or replace function public.my_bands()
returns table (
  band_id bigint, name text, photo_url text, members integer, unread integer,
  last_kind text, last_body text, last_sender text, last_mine boolean, last_at timestamptz
) language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.photo_url,
    (select count(*)::integer from public.band_members x join public.projects xp on xp.id = x.project_id where x.band_id = b.id and xp.end_year is null),
    (select count(*)::integer from public.band_messages m where m.band_id = b.id and m.created_at > coalesce(bm.last_read_at, bm.joined_at)
       and m.sender_id is distinct from auth.uid()),
    l.kind, l.body, lp.first_name, l.sender_id = auth.uid(), l.created_at
  from public.band_members bm
  join public.projects pr on pr.id = bm.project_id and pr.end_year is null
  join public.bands b on b.id = bm.band_id
  left join lateral (select * from public.band_messages m where m.band_id = b.id order by m.created_at desc limit 1) l on true
  left join public.profiles lp on lp.id = l.sender_id
  where bm.profile_id = auth.uid()
  order by coalesce(l.created_at, bm.joined_at) desc;
$$;

-- 5. The band page, now with its details, shows, open spots and the bands it shared a bill with.

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
    'bio', b.bio,
    'city', b.city,
    'genres', b.genres,
    'status', b.status,
    'photo_url', b.photo_url,
    'is_member', auth.uid() is not null and public.is_band_member(b.id),
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
    ), '[]'::jsonb),
    'shows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'date', s.show_date, 'time', s.show_time, 'venue', s.venue, 'city', s.city,
        'ticket_url', s.ticket_url, 'with_text', s.with_text,
        'with_bands', coalesce((
          select jsonb_agg(jsonb_build_object('id', ob.id, 'name', ob.name))
          from public.band_show_bands sb join public.bands ob on ob.id = sb.band_id
          where sb.show_id = s.id and sb.confirmed_at is not null
        ), '[]'::jsonb)
      ) order by s.show_date, s.id)
      from public.band_shows s where s.band_id = b.id and s.show_date >= current_date - 1
    ), '[]'::jsonb),
    'spots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bp.id, 'title', bp.title, 'role', bp.role, 'details', bp.details, 'paid', bp.paid, 'pay', bp.pay,
        'asked', (select count(*) from public.board_replies r where r.post_id = bp.id),
        'answered', auth.uid() is not null and exists (select 1 from public.board_replies r where r.post_id = bp.id and r.from_id = auth.uid())
      ) order by bp.created_at desc)
      from public.board_posts bp
      where bp.band_id = b.id and bp.closed_at is null and (bp.closes_on is null or bp.closes_on >= current_date)
    ), '[]'::jsonb),
    -- Bands it played a confirmed show with, either side's show.
    'shared_stage', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'photo_url', x.photo_url, 'shows', x.shows) order by x.shows desc, x.name)
      from (
        select ob.id, ob.name, ob.photo_url, count(*)::integer as shows
        from (
          select sb.band_id as other from public.band_shows s join public.band_show_bands sb on sb.show_id = s.id
          where s.band_id = b.id and sb.confirmed_at is not null
          union all
          select s.band_id from public.band_shows s join public.band_show_bands sb on sb.show_id = s.id
          where sb.band_id = b.id and sb.confirmed_at is not null
        ) pairs join public.bands ob on ob.id = pairs.other
        group by ob.id, ob.name, ob.photo_url
      ) x
    ), '[]'::jsonb)
  )
  from public.bands b
  where b.id = p_id and exists (select 1 from members);
$$;

-- Shared bills waiting on your band to confirm.
create or replace function public.band_bills_to_confirm(p_band bigint)
returns table (show_id bigint, from_band bigint, from_name text, show_date date, venue text)
language sql stable security definer set search_path = public as $$
  select s.id, ob.id, ob.name, s.show_date, s.venue
  from public.band_show_bands sb
  join public.band_shows s on s.id = sb.show_id
  join public.bands ob on ob.id = s.band_id
  where sb.band_id = p_band and sb.confirmed_at is null and public.is_band_member(p_band)
  order by s.show_date desc;
$$;

-- 6. Finding bands: every band with someone on Mixstro, its open roles, and how far its nearest
-- current member is from you (whole miles, like people; points are never returned).
create or replace function public.browse_bands()
returns table (
  band_id bigint, name text, photo_url text, city text, genres text[], status text,
  members integer, open_roles text[], open_spot_id bigint, miles integer
) language sql stable security definer set search_path = public as $$
  with mine as (select lat, lng from public.profile_locations where profile_id = auth.uid()),
  live as (
    select bm.band_id, bm.profile_id
    from public.band_members bm
    join public.projects pr on pr.id = bm.project_id and pr.end_year is null
    join public.profiles p on p.id = bm.profile_id and p.onboarded_at is not null
    where not public.is_blocked(auth.uid(), bm.profile_id)
  )
  select b.id, b.name, b.photo_url, b.city, b.genres, b.status,
    (select count(*)::integer from live l where l.band_id = b.id),
    coalesce((select array_agg(coalesce(bp.role, bp.title) order by bp.created_at desc) from public.board_posts bp
      where bp.band_id = b.id and bp.closed_at is null and (bp.closes_on is null or bp.closes_on >= current_date)), '{}'),
    (select bp.id from public.board_posts bp
      where bp.band_id = b.id and bp.closed_at is null and (bp.closes_on is null or bp.closes_on >= current_date)
      order by bp.created_at desc limit 1),
    (select case when count(*) > 0 then greatest(1, round(min(3958.8 * 2 * asin(sqrt(
        power(sin(radians(o.lat - me.lat) / 2), 2)
        + cos(radians(me.lat)) * cos(radians(o.lat)) * power(sin(radians(o.lng - me.lng) / 2), 2)
      )))))::integer end
      from live l join public.profile_locations o on o.profile_id = l.profile_id cross join mine me
      where l.band_id = b.id)
  from public.bands b
  where b.status <> 'done' and exists (select 1 from live l where l.band_id = b.id)
  limit 300;
$$;

revoke all on function public.is_band_member(bigint, uuid) from public;
revoke all on function public.update_band(bigint, text, text, text[], text, text) from public;
revoke all on function public.confirm_shared_bill(bigint, bigint) from public;
revoke all on function public.mark_band_read(bigint) from public;
revoke all on function public.send_band_note(bigint, text) from public;
revoke all on function public.band_folder_member(text) from public;
revoke all on function public.my_bands() from public;
revoke all on function public.public_band(bigint) from public;
revoke all on function public.band_bills_to_confirm(bigint) from public;
revoke all on function public.browse_bands() from public;
revoke all on function public.board_post_band_check() from public;
revoke all on function public.band_chat_on_reply() from public;
revoke all on function public.band_chat_on_show() from public;
revoke all on function public.band_chat_on_join() from public;
grant execute on function public.is_band_member(bigint, uuid) to authenticated;
grant execute on function public.update_band(bigint, text, text, text[], text, text) to authenticated;
grant execute on function public.confirm_shared_bill(bigint, bigint) to authenticated;
grant execute on function public.mark_band_read(bigint) to authenticated;
grant execute on function public.send_band_note(bigint, text) to authenticated;
grant execute on function public.band_folder_member(text) to authenticated;
grant execute on function public.my_bands() to authenticated;
grant execute on function public.public_band(bigint) to anon, authenticated;
grant execute on function public.band_bills_to_confirm(bigint) to authenticated;
grant execute on function public.browse_bands() to authenticated;
