-- #7 Jam invite and #8 "Did you jam?"
--
-- After a Connect, either person proposes a time and place. The other person accepts,
-- declines, or suggests another time (a new proposal that replaces the old one).
-- A day after an accepted jam, each person privately says whether they actually played.
-- Answers stay hidden until both reply; two thumbs up marks the pair as "played together".

create table if not exists public.jams (
  id bigint generated always as identity primary key,
  connection_id bigint not null references public.connections (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  place text not null check (char_length(place) between 2 and 120),
  note text check (note is null or char_length(note) <= 280),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined', 'replaced', 'cancelled')),
  replaces_id bigint references public.jams (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists jams_connection_idx on public.jams (connection_id, created_at);

alter table public.jams enable row level security;

create or replace function public.in_connection(conn bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.id = conn and c.status = 'accepted' and auth.uid() in (c.from_id, c.to_id)
      and not public.is_blocked(c.from_id, c.to_id)
  );
$$;
revoke all on function public.in_connection(bigint) from public, anon;
grant execute on function public.in_connection(bigint) to authenticated;

drop policy if exists "see jams" on public.jams;
create policy "see jams" on public.jams for select to authenticated using (public.in_connection(connection_id));

drop policy if exists "propose jams" on public.jams;
create policy "propose jams" on public.jams for insert to authenticated with check (
  proposed_by = auth.uid() and status = 'proposed' and public.in_connection(connection_id)
  and starts_at > now() - interval '1 hour'
);

-- The other person answers (accepted / declined / replaced by their new time);
-- the proposer can only cancel their own invite.
drop policy if exists "answer jams" on public.jams;
create policy "answer jams" on public.jams for update to authenticated
  using (public.in_connection(connection_id))
  with check (
    public.in_connection(connection_id) and (
      (proposed_by <> auth.uid() and status in ('accepted', 'declined', 'replaced'))
      or (proposed_by = auth.uid() and status = 'cancelled')
    )
  );

-- Only the time/place a person proposed can't be edited after the fact.
create or replace function public.jams_lock_details()
returns trigger
language plpgsql
as $$
begin
  if new.connection_id <> old.connection_id or new.proposed_by <> old.proposed_by
     or new.starts_at <> old.starts_at or new.place <> old.place or new.note is distinct from old.note then
    raise exception 'A jam''s details can''t change. Suggest another time instead.';
  end if;
  if old.status <> 'proposed' then
    raise exception 'This invite was already answered.';
  end if;
  new.responded_at := now();
  return new;
end;
$$;
drop trigger if exists jams_lock_details on public.jams;
create trigger jams_lock_details before update on public.jams for each row execute function public.jams_lock_details();

alter publication supabase_realtime add table public.jams;

-- #8 Did you jam? -------------------------------------------------------------

create table if not exists public.jam_checkins (
  jam_id bigint not null references public.jams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  played boolean not null,
  created_at timestamptz not null default now(),
  primary key (jam_id, profile_id)
);

alter table public.jam_checkins enable row level security;

-- You only ever see your own answer directly.
drop policy if exists "own checkins" on public.jam_checkins;
create policy "own checkins" on public.jam_checkins for select to authenticated using (profile_id = auth.uid());

drop policy if exists "check in" on public.jam_checkins;
create policy "check in" on public.jam_checkins for insert to authenticated with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.jams j
    where j.id = jam_id and j.status = 'accepted' and j.starts_at < now() and public.in_connection(j.connection_id)
  )
);

-- Per jam in a conversation you're in: 'waiting' until both answered, then
-- 'played' when both said yes, otherwise 'not_played'. Never reveals one person's answer alone.
create or replace function public.jam_outcomes(conn bigint)
returns table (jam_id bigint, outcome text)
language sql
stable
security definer
set search_path = public
as $$
  select j.id,
    case
      when count(c.profile_id) < 2 then 'waiting'
      when bool_and(c.played) then 'played'
      else 'not_played'
    end
  from public.jams j
  left join public.jam_checkins c on c.jam_id = j.id
  where j.connection_id = conn and j.status = 'accepted' and public.in_connection(conn)
  group by j.id;
$$;
revoke all on function public.jam_outcomes(bigint) from public, anon;
grant execute on function public.jam_outcomes(bigint) to authenticated;
