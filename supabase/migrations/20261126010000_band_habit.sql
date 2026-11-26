-- Keep the band in the app once it's formed (pre-mortem risk 3, "success is churn"):
--   rehearsals with who's in, setlists, and fill-in requests (a dated Board opening for the band).
-- Members only, like the rest of Your band. Safe to run twice.

-- 1) Rehearsals -----------------------------------------------------------------------------

create table if not exists public.band_rehearsals (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  starts_at timestamptz not null,
  place text not null check (char_length(place) between 2 and 80),
  note text check (note is null or char_length(note) <= 200),
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists band_rehearsals_band_idx on public.band_rehearsals (band_id, starts_at);

create table if not exists public.band_rehearsal_rsvps (
  rehearsal_id bigint not null references public.band_rehearsals (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null check (answer in ('in', 'out')),
  updated_at timestamptz not null default now(),
  primary key (rehearsal_id, profile_id)
);

alter table public.band_rehearsals enable row level security;
alter table public.band_rehearsal_rsvps enable row level security;

drop policy if exists "members read rehearsals" on public.band_rehearsals;
create policy "members read rehearsals" on public.band_rehearsals for select to authenticated using (public.is_band_member(band_id));
drop policy if exists "members remove rehearsals" on public.band_rehearsals;
create policy "members remove rehearsals" on public.band_rehearsals for delete to authenticated using (public.is_band_member(band_id));
-- Adding goes through plan_rehearsals(), so a weekly plan posts one line in the chat, not four.

drop policy if exists "members read answers" on public.band_rehearsal_rsvps;
create policy "members read answers" on public.band_rehearsal_rsvps for select to authenticated using (
  exists (select 1 from public.band_rehearsals r where r.id = rehearsal_id and public.is_band_member(r.band_id))
);
drop policy if exists "answer for yourself" on public.band_rehearsal_rsvps;
create policy "answer for yourself" on public.band_rehearsal_rsvps for insert to authenticated with check (
  profile_id = auth.uid() and exists (select 1 from public.band_rehearsals r where r.id = rehearsal_id and public.is_band_member(r.band_id))
);
drop policy if exists "change your answer" on public.band_rehearsal_rsvps;
create policy "change your answer" on public.band_rehearsal_rsvps for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- The band chat gets a card for planned rehearsals.
alter table public.band_messages drop constraint if exists band_messages_kind_check;
alter table public.band_messages add constraint band_messages_kind_check
  check (kind in ('text', 'voice', 'note', 'spot_reply', 'show', 'joined', 'rehearsal'));

-- Plan one rehearsal, or the same time weekly for up to 8 weeks. You're in for the ones you plan.
-- The chat line's body is "<first start, ISO>|<place>|<weeks>" so each phone shows its own time zone.
create or replace function public.plan_rehearsals(p_band bigint, p_starts timestamptz, p_place text, p_note text default null, p_weeks integer default 1)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  weeks integer := greatest(1, least(coalesce(p_weeks, 1), 8));
  place text := left(regexp_replace(trim(coalesce(p_place, '')), '\s+', ' ', 'g'), 80);
  first_id bigint;
  rid bigint;
  i integer;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not public.is_band_member(p_band) then raise exception 'not in this band'; end if;
  if p_starts is null or p_starts < now() - interval '1 hour' or p_starts > now() + interval '1 year' then raise exception 'pick a time ahead'; end if;
  if char_length(place) < 2 then raise exception 'say where'; end if;
  if (select count(*) from public.band_rehearsals where band_id = p_band and starts_at > now()) + weeks > 20 then
    raise exception 'too many planned';
  end if;
  for i in 0 .. weeks - 1 loop
    insert into public.band_rehearsals (band_id, starts_at, place, note, added_by)
    values (p_band, p_starts + make_interval(weeks => i), place, nullif(left(trim(coalesce(p_note, '')), 200), ''), me)
    returning id into rid;
    insert into public.band_rehearsal_rsvps (rehearsal_id, profile_id, answer) values (rid, me, 'in');
    if first_id is null then first_id := rid; end if;
  end loop;
  insert into public.band_messages (band_id, sender_id, kind, body, ref_id)
  values (p_band, me, 'rehearsal', to_char(p_starts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || '|' || place || '|' || weeks, first_id);
  return weeks;
end $$;
revoke all on function public.plan_rehearsals(bigint, timestamptz, text, text, integer) from public, anon;
grant execute on function public.plan_rehearsals(bigint, timestamptz, text, text, integer) to authenticated;

-- 2) Setlists -------------------------------------------------------------------------------

create table if not exists public.band_setlists (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  songs text[] not null default '{}' check (cardinality(songs) <= 60),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists band_setlists_band_idx on public.band_setlists (band_id, updated_at desc);
alter table public.band_setlists enable row level security;

drop policy if exists "members read setlists" on public.band_setlists;
create policy "members read setlists" on public.band_setlists for select to authenticated using (public.is_band_member(band_id));
drop policy if exists "members add setlists" on public.band_setlists;
create policy "members add setlists" on public.band_setlists for insert to authenticated
  with check (public.is_band_member(band_id) and updated_by = auth.uid());
drop policy if exists "members edit setlists" on public.band_setlists;
create policy "members edit setlists" on public.band_setlists for update to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id) and updated_by = auth.uid());
drop policy if exists "members remove setlists" on public.band_setlists;
create policy "members remove setlists" on public.band_setlists for delete to authenticated using (public.is_band_member(band_id));

-- Song titles: trimmed, non-empty, at most 80 characters each.
create or replace function public.band_setlist_clean()
returns trigger language plpgsql set search_path = public as $$
begin
  new.songs := coalesce((select array_agg(left(trim(s), 80) order by o) from unnest(new.songs) with ordinality u(s, o) where trim(s) <> ''), '{}');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists band_setlist_clean on public.band_setlists;
create trigger band_setlist_clean before insert or update on public.band_setlists
  for each row execute function public.band_setlist_clean();
revoke all on function public.band_setlist_clean() from public, anon, authenticated;

grant select, insert, update, delete on public.band_rehearsals, public.band_rehearsal_rsvps, public.band_setlists to authenticated;
