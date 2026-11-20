-- Band name generator: anonymous band votes ("Help us pick a band name") and simple daily
-- counts for the free tools on mixstro.com, shown on Pulse. Safe to run more than once.
--
-- Nobody signs in to vote. The website gives each browser a random id in an httpOnly cookie
-- and passes it to these functions; the tables have no policies, so they are reachable only
-- through the functions below. The browser that made a vote can open new rounds on the same
-- link (organizer = sha256 of its id). Individual votes are never returned, only totals.

create table if not exists public.name_ballots (
  id uuid primary key default gen_random_uuid(),
  organizer_hash text not null check (organizer_hash ~ '^[0-9a-f]{64}$'),
  kind text not null default 'band' check (kind in ('band', 'single', 'closer')),
  options text[] not null check (array_length(options, 1) = 3),
  round int not null default 1,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists name_ballots_created_idx on public.name_ballots (created_at);
alter table public.name_ballots enable row level security;

create table if not exists public.name_votes (
  ballot_id uuid not null references public.name_ballots (id) on delete cascade,
  round int not null,
  voter uuid not null,
  choice smallint not null check (choice between 0 and 2),
  created_at timestamptz not null default now(),
  primary key (ballot_id, round, voter)
);
alter table public.name_votes enable row level security;
-- No policies on either table: only the functions below read or write them.

-- Three distinct options, 1 to 80 characters, no control characters or angle brackets.
create or replace function public.name_ballot_options_ok(p_options text[])
returns boolean language sql immutable as $$
  select coalesce(array_length(p_options, 1), 0) = 3
    and (select bool_and(o is not null and o = btrim(o) and char_length(o) between 1 and 80 and o !~ '[[:cntrl:]<>]') from unnest(p_options) o)
    and (select count(distinct lower(o)) from unnest(p_options) o) = 3;
$$;

-- What a browser sees: the question, the options, totals once it has voted (or made the
-- vote), its own pick, and earlier rounds.
create or replace function public.name_ballot_get(p_id uuid, p_voter uuid, p_organizer_hash text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  b public.name_ballots;
  mine smallint;
  is_org boolean;
  counts int[];
begin
  select * into b from public.name_ballots where id = p_id;
  if not found then return null; end if;
  is_org := p_organizer_hash is not null and p_organizer_hash = b.organizer_hash;
  select choice into mine from public.name_votes where ballot_id = p_id and round = b.round and voter = p_voter;
  select array[
    count(*) filter (where choice = 0), count(*) filter (where choice = 1), count(*) filter (where choice = 2)
  ]::int[] into counts from public.name_votes where ballot_id = p_id and round = b.round;
  return jsonb_build_object(
    'id', b.id,
    'kind', b.kind,
    'options', to_jsonb(b.options),
    'round', b.round,
    'choice', mine,
    'organizer', is_org,
    'counts', case when mine is not null or is_org then to_jsonb(counts) else null end,
    'voters', (select count(*) from public.name_votes where ballot_id = p_id and round = b.round),
    'history', b.history
  );
end;
$$;

create or replace function public.name_ballot_create(p_options text[], p_organizer_hash text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if not public.name_ballot_options_ok(p_options) then raise exception 'invalid options'; end if;
  if p_organizer_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid organizer'; end if;
  -- A brake on scripted spam: at most 300 new votes an hour across the site.
  if (select count(*) from public.name_ballots where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'busy';
  end if;
  insert into public.name_ballots (organizer_hash, options) values (p_organizer_hash, p_options) returning id into new_id;
  return new_id;
end;
$$;

-- Vote or change your vote. A vote for a round that has closed is refused.
create or replace function public.name_ballot_vote(p_id uuid, p_round int, p_voter uuid, p_choice int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  current_round int;
begin
  if p_voter is null or p_choice is null or p_choice not between 0 and 2 then raise exception 'invalid vote'; end if;
  select round into current_round from public.name_ballots where id = p_id for share;
  if not found then raise exception 'not found'; end if;
  if current_round <> p_round then raise exception 'stale round'; end if;
  insert into public.name_votes (ballot_id, round, voter, choice) values (p_id, p_round, p_voter, p_choice)
  on conflict (ballot_id, round, voter) do update set choice = excluded.choice, created_at = now();
  return public.name_ballot_get(p_id, p_voter, null);
end;
$$;

-- The organizer closes the current round (its totals move to history) and asks a new question.
create or replace function public.name_ballot_round(p_id uuid, p_round int, p_organizer_hash text, p_kind text, p_options text[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  b public.name_ballots;
  counts int[];
begin
  if p_kind not in ('band', 'single', 'closer') or not public.name_ballot_options_ok(p_options) then raise exception 'invalid options'; end if;
  select * into b from public.name_ballots where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if b.organizer_hash <> p_organizer_hash then raise exception 'not organizer'; end if;
  if b.round <> p_round then raise exception 'stale round'; end if;
  if jsonb_array_length(b.history) >= 20 then raise exception 'too many rounds'; end if;
  select array[
    count(*) filter (where choice = 0), count(*) filter (where choice = 1), count(*) filter (where choice = 2)
  ]::int[] into counts from public.name_votes where ballot_id = p_id and round = b.round;
  update public.name_ballots set
    history = b.history || jsonb_build_array(jsonb_build_object('round', b.round, 'kind', b.kind, 'options', to_jsonb(b.options), 'counts', to_jsonb(counts))),
    kind = p_kind, options = p_options, round = b.round + 1, updated_at = now()
  where id = p_id;
  return public.name_ballot_get(p_id, null, p_organizer_hash);
end;
$$;

revoke all on function public.name_ballot_options_ok(text[]) from public;
revoke all on function public.name_ballot_get(uuid, uuid, text) from public;
revoke all on function public.name_ballot_create(text[], text) from public;
revoke all on function public.name_ballot_vote(uuid, int, uuid, int) from public;
revoke all on function public.name_ballot_round(uuid, int, text, text, text[]) from public;
grant execute on function public.name_ballot_get(uuid, uuid, text) to anon, authenticated;
grant execute on function public.name_ballot_create(text[], text) to anon, authenticated;
grant execute on function public.name_ballot_vote(uuid, int, uuid, int) to anon, authenticated;
grant execute on function public.name_ballot_round(uuid, int, text, text, text[]) to anon, authenticated;

-- Daily counts for the free tools (no people, no ids: just name and day) -------------------

create table if not exists public.tool_counts (
  day date not null default current_date,
  name text not null,
  n int not null default 0,
  primary key (day, name)
);
alter table public.tool_counts enable row level security;

create or replace function public.tool_event(p_name text)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_name not in (
    'bng_generate', 'bng_shortlist', 'bng_check', 'bng_share', 'bng_story',
    'bng_vote_created', 'bng_vote_cast', 'bng_round', 'bng_signup_click', 'bng_profile_done'
  ) then return; end if;
  insert into public.tool_counts (day, name, n) values (current_date, p_name, 1)
  on conflict (day, name) do update set n = public.tool_counts.n + 1;
end;
$$;
revoke all on function public.tool_event(text) from public;
grant execute on function public.tool_event(text) to anon, authenticated;

-- Pulse: last 28 days of tool counts plus how many votes got a second voter or a second round.
create or replace function public.tool_pulse()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_pulse() then return null; end if;
  return jsonb_build_object(
    'days', 28,
    'counts', coalesce((select jsonb_object_agg(name, total) from (
      select name, sum(n)::int total from public.tool_counts where day > current_date - 28 group by name) t), '{}'::jsonb),
    'votes_made', (select count(*) from public.name_ballots where created_at > now() - interval '28 days'),
    'votes_two_voters', (select count(*) from public.name_ballots b where b.created_at > now() - interval '28 days'
      and (select count(distinct voter) from public.name_votes v where v.ballot_id = b.id) >= 2),
    'votes_second_round', (select count(*) from public.name_ballots where created_at > now() - interval '28 days' and round >= 2)
  );
end;
$$;
revoke all on function public.tool_pulse() from public, anon;
grant execute on function public.tool_pulse() to authenticated;
