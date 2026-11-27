-- Claim pilot: band pages we start from public info (MusicBrainz) that the band claims.
--
-- An unclaimed band has no members yet, so the existing public_band(), browse_bands() and the
-- sitemap already leave it out. It gets its own read, unclaimed_band(), and its page is noindex.
-- Lineup names come in as seats ("Carson Hogan, guitar"). A musician claims the band or their
-- seat with a code they post on the band's official Instagram or website; a Pulse viewer checks
-- it and approves. Approval makes them a real member, the normal band page takes over, and the
-- remaining seats stay open for bandmates (a current member can approve those too).
-- Anyone can ask for a page to come down; a Pulse viewer removes it.

-- 1. Bands: claim state, where the info came from, official links ---------------------------

alter table public.bands add column if not exists claim_state text not null default 'claimed';
alter table public.bands add column if not exists source text;
alter table public.bands add column if not exists source_ref jsonb not null default '{}'::jsonb;
alter table public.bands add column if not exists instagram_url text;
alter table public.bands add column if not exists website_url text;

alter table public.bands drop constraint if exists bands_claim_details;
alter table public.bands add constraint bands_claim_details check (
  claim_state in ('unclaimed', 'claimed')
  and (source is null or source in ('musicbrainz'))
  and (instagram_url is null or (char_length(instagram_url) <= 300 and instagram_url ~ '^https://(www\.)?instagram\.com/'))
  and (website_url is null or (char_length(website_url) <= 300 and website_url ~ '^https?://'))
);

-- 2. Seats: names from the public lineup, until the person claims them ------------------------

create table if not exists public.band_seats (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text check (role is null or char_length(role) <= 80),
  rank smallint not null default 0,
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  unique (band_id, name)
);
create index if not exists band_seats_band_idx on public.band_seats (band_id, rank);
alter table public.band_seats enable row level security;

-- 3. Claims -----------------------------------------------------------------------------------

create table if not exists public.band_claims (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  seat_id bigint references public.band_seats (id) on delete set null,
  claimant uuid not null references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^MIX-[A-Z0-9]{6}$'),
  proof_url text check (proof_url is null or (char_length(proof_url) <= 500 and proof_url ~ '^https?://')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);
create unique index if not exists band_claims_one_open on public.band_claims (band_id, claimant) where status = 'pending';
create index if not exists band_claims_pending_idx on public.band_claims (created_at) where status = 'pending';
alter table public.band_claims enable row level security;

-- 4. Removal requests ---------------------------------------------------------------------------

create table if not exists public.band_removals (
  id bigint generated always as identity primary key,
  band_id bigint references public.bands (id) on delete set null,
  band_name text not null,
  contact text check (contact is null or char_length(contact) <= 200),
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.band_removals enable row level security;
-- No policies on the three tables: everything goes through the functions below.

-- 5. Reads ----------------------------------------------------------------------------------------

-- An unclaimed band's page. Null for any other band (claimed bands use public_band()).
create or replace function public.unclaimed_band(p_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', b.id,
    'name', b.name,
    'city', b.city,
    'genres', b.genres,
    'instagram_url', b.instagram_url,
    'website_url', b.website_url,
    'source', b.source,
    'mbid', b.source_ref ->> 'mbid',
    'seats', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role, 'claimed', s.claimed_by is not null) order by s.rank, s.id)
      from public.band_seats s where s.band_id = b.id
    ), '[]'::jsonb),
    'my_claim', (
      select jsonb_build_object('id', c.id, 'code', c.code, 'status', c.status, 'proof_url', c.proof_url, 'seat_id', c.seat_id)
      from public.band_claims c
      where auth.uid() is not null and c.band_id = b.id and c.claimant = auth.uid()
      order by c.created_at desc limit 1
    )
  )
  from public.bands b
  where b.id = p_id and b.claim_state = 'unclaimed';
$$;

-- Seats nobody has claimed yet on a claimed band ("Also in the band"), plus your open claim.
create or replace function public.band_open_seats(p_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'seats', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role) order by s.rank, s.id)
      from public.band_seats s where s.band_id = p_id and s.claimed_by is null
    ), '[]'::jsonb),
    'my_claim', (
      select jsonb_build_object('id', c.id, 'code', c.code, 'status', c.status, 'proof_url', c.proof_url, 'seat_id', c.seat_id)
      from public.band_claims c
      where c.band_id = p_id and c.claimant = auth.uid()
      order by c.created_at desc limit 1
    )
  )
  where auth.uid() is not null;
$$;

-- 6. Claiming ---------------------------------------------------------------------------------

-- Start (or reopen) a claim on a band or one seat in it. Returns the code to post.
create or replace function public.start_claim(p_band bigint, p_seat bigint default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.band_claims;
  st text;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.profiles where id = me and onboarded_at is not null) then
    raise exception 'finish your profile first';
  end if;
  select claim_state into st from public.bands where id = p_band;
  if st is null then raise exception 'no such band'; end if;
  if exists (select 1 from public.band_members where band_id = p_band and profile_id = me) then
    raise exception 'you are already in this band';
  end if;
  if p_seat is null and st = 'claimed' then raise exception 'pick your name in the lineup'; end if;
  if p_seat is not null and not exists (select 1 from public.band_seats where id = p_seat and band_id = p_band and claimed_by is null) then
    raise exception 'that spot is taken';
  end if;

  select * into c from public.band_claims where band_id = p_band and claimant = me and status = 'pending';
  if c.id is not null then
    update public.band_claims set seat_id = p_seat where id = c.id returning * into c;
  else
    if (select count(*) from public.band_claims where claimant = me and status = 'pending') >= 3 then
      raise exception 'you have 3 claims waiting already';
    end if;
    insert into public.band_claims (band_id, seat_id, claimant, code)
    values (p_band, p_seat, me, 'MIX-' || upper(substr(md5(random()::text || clock_timestamp()::text || me::text), 1, 6)))
    returning * into c;
  end if;
  return jsonb_build_object('id', c.id, 'code', c.code, 'status', c.status, 'proof_url', c.proof_url, 'seat_id', c.seat_id);
end $$;

-- Where the code is posted (an Instagram post, story highlight or a page on the band's site).
create or replace function public.submit_claim_proof(p_claim bigint, p_proof_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  u text := btrim(p_proof_url);
begin
  if u !~ '^https?://' or char_length(u) > 500 then raise exception 'paste a full link that starts with https://'; end if;
  update public.band_claims set proof_url = u
  where id = p_claim and claimant = auth.uid() and status = 'pending';
  if not found then raise exception 'no open claim'; end if;
end $$;

-- Approve or reject. Pulse viewers decide any claim; a current member can decide seat claims
-- on a band that is already claimed (they know their bandmates).
create or replace function public.decide_claim(p_claim bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.band_claims;
  b public.bands;
  seat public.band_seats;
  proj bigint;
  yr smallint;
begin
  select * into c from public.band_claims where id = p_claim and status = 'pending' for update;
  if c.id is null then raise exception 'no open claim'; end if;
  select * into b from public.bands where id = c.band_id for update;
  if not (public.can_view_pulse() or (b.claim_state = 'claimed' and c.seat_id is not null and public.is_band_member(b.id, me))) then
    raise exception 'not allowed';
  end if;

  if not p_approve then
    update public.band_claims set status = 'rejected', decided_at = now(), decided_by = me where id = c.id;
    return;
  end if;

  if c.seat_id is not null then
    select * into seat from public.band_seats where id = c.seat_id for update;
    if seat.claimed_by is not null and seat.claimed_by <> c.claimant then raise exception 'that spot is taken'; end if;
  end if;

  if not exists (select 1 from public.band_members where band_id = b.id and profile_id = c.claimant) then
    yr := least(greatest(coalesce(nullif(b.source_ref ->> 'first_year', '')::smallint, extract(year from now())::smallint), 1950::smallint), extract(year from now())::smallint);
    insert into public.projects (profile_id, name, role, start_year)
    values (c.claimant, b.name, seat.role, yr)
    returning id into proj;
    insert into public.band_members (band_id, profile_id, project_id) values (b.id, c.claimant, proj);
  end if;

  if seat.id is not null then
    update public.band_seats set claimed_by = c.claimant, claimed_at = now() where id = seat.id;
  end if;
  update public.bands set claim_state = 'claimed', created_by = coalesce(created_by, c.claimant), updated_at = now() where id = b.id;
  update public.band_claims set status = 'approved', decided_at = now(), decided_by = me where id = c.id;
end $$;

-- Pulse: open claims and removal requests.
create or replace function public.claim_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_pulse() then return null; end if;
  return jsonb_build_object(
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'band_id', b.id, 'band', b.name, 'state', b.claim_state,
        'instagram_url', b.instagram_url, 'website_url', b.website_url,
        'seat', s.name, 'role', s.role, 'code', c.code, 'proof_url', c.proof_url, 'created_at', c.created_at,
        'username', p.username, 'first_name', p.first_name
      ) order by c.created_at)
      from public.band_claims c
      join public.bands b on b.id = c.band_id
      join public.profiles p on p.id = c.claimant
      left join public.band_seats s on s.id = c.seat_id
      where c.status = 'pending'
    ), '[]'::jsonb),
    'removals', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'band_id', r.band_id, 'band', r.band_name, 'contact', r.contact, 'reason', r.reason, 'created_at', r.created_at) order by r.created_at)
      from public.band_removals r where r.done_at is null
    ), '[]'::jsonb),
    'unclaimed', (select count(*) from public.bands where claim_state = 'unclaimed'),
    'claimed_from_pilot', (select count(*) from public.bands where claim_state = 'claimed' and source is not null)
  );
end $$;

-- 7. Removal ----------------------------------------------------------------------------------

-- "Remove this page": anyone, signed in or not. Only for unclaimed pages; a few per band.
create or replace function public.request_band_removal(p_band bigint, p_contact text default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  nm text;
begin
  select name into nm from public.bands where id = p_band and claim_state = 'unclaimed';
  if nm is null then raise exception 'no such page'; end if;
  if (select count(*) from public.band_removals where band_id = p_band and done_at is null) >= 5 then return; end if;
  insert into public.band_removals (band_id, band_name, contact, reason)
  values (p_band, nm, nullif(left(btrim(coalesce(p_contact, '')), 200), ''), nullif(left(btrim(coalesce(p_reason, '')), 1000), ''));
end $$;

-- Pulse: take an unclaimed page down (and close its requests), or dismiss a request.
create or replace function public.resolve_band_removal(p_request bigint, p_remove boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  band bigint;
begin
  if not public.can_view_pulse() then raise exception 'not allowed'; end if;
  select band_id into band from public.band_removals where id = p_request and done_at is null;
  if not found then raise exception 'no open request'; end if;
  update public.band_removals set done_at = now() where band_id = band and done_at is null;
  update public.band_removals set done_at = now() where id = p_request;
  if p_remove and band is not null then
    delete from public.bands where id = band and claim_state = 'unclaimed';
  end if;
end $$;

-- 8. Grants ---------------------------------------------------------------------------------

revoke all on function public.unclaimed_band(bigint) from public;
revoke all on function public.band_open_seats(bigint) from public;
revoke all on function public.start_claim(bigint, bigint) from public;
revoke all on function public.submit_claim_proof(bigint, text) from public;
revoke all on function public.decide_claim(bigint, boolean) from public;
revoke all on function public.claim_queue() from public;
revoke all on function public.request_band_removal(bigint, text, text) from public;
revoke all on function public.resolve_band_removal(bigint, boolean) from public;
grant execute on function public.unclaimed_band(bigint) to anon, authenticated;
grant execute on function public.request_band_removal(bigint, text, text) to anon, authenticated;
grant execute on function public.band_open_seats(bigint) to authenticated;
grant execute on function public.start_claim(bigint, bigint) to authenticated;
grant execute on function public.submit_claim_proof(bigint, text) to authenticated;
grant execute on function public.decide_claim(bigint, boolean) to authenticated;
grant execute on function public.claim_queue() to authenticated;
grant execute on function public.resolve_band_removal(bigint, boolean) to authenticated;
revoke all on public.band_seats, public.band_claims, public.band_removals from anon;
