-- Handoff PR 2: anonymous ballots only through the server, and fair request budgets.
-- Safe to run more than once.
--
-- ORDER: deploy the app version that calls these functions with the server key FIRST, then
-- run this. (The older app calls them as a signed-out visitor, which this switches off.)
--
-- 1) Ballots. Until now anyone holding the public anon key could call name_ballot_vote with
--    any made-up voter id and stuff a vote. Now only the server (service role) can call the
--    ballot functions; it identifies a browser by its httpOnly cookie and applies per-caller
--    budgets before it gets here. Existing links, votes and organizers keep working: the
--    organizer hash is computed exactly as before.
-- 2) A small fixed-window limiter the server uses for per-caller budgets (per browser or IP),
--    next to the existing global brakes.

-- 1) Ballots --------------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('name_ballot_get', 'name_ballot_create', 'name_ballot_vote', 'name_ballot_round', 'tool_event')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- Per-organizer budget alongside the global one: one browser can't use up everyone's 300 an hour.
create index if not exists name_ballots_org_created_idx on public.name_ballots (organizer_hash, created_at);

create or replace function public.name_ballot_create(p_options text[], p_organizer_hash text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if not public.name_ballot_options_ok(p_options) then raise exception 'invalid options'; end if;
  if p_organizer_hash is null or p_organizer_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid organizer'; end if;
  if (select count(*) from public.name_ballots where organizer_hash = p_organizer_hash and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'busy: caller';
  end if;
  if (select count(*) from public.name_ballots where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'busy';
  end if;
  insert into public.name_ballots (organizer_hash, options) values (p_organizer_hash, p_options) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.name_ballot_create(text[], text) from public, anon, authenticated;
grant execute on function public.name_ballot_create(text[], text) to service_role;

-- Organizer writes need a well-formed credential, not just "something that isn't the hash".
create or replace function public.name_ballot_round(p_id uuid, p_round int, p_organizer_hash text, p_kind text, p_options text[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  b public.name_ballots;
  counts int[];
begin
  if p_organizer_hash is null or p_organizer_hash !~ '^[0-9a-f]{64}$' then raise exception 'not organizer'; end if;
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
revoke all on function public.name_ballot_round(uuid, int, text, text, text[]) from public, anon, authenticated;
grant execute on function public.name_ballot_round(uuid, int, text, text, text[]) to service_role;

-- 2) Request budgets ------------------------------------------------------------------------
create table if not exists public.rate_buckets (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_buckets enable row level security;
revoke all on public.rate_buckets from anon, authenticated;

-- Counts a hit and says whether it's within budget. p_key names the budget and the caller
-- ("bng_vote:ip:1.2.3.4", "bng_vote:all"). Old windows are swept as it goes.
create or replace function public.rate_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_buckets (key, window_start, hits) values (left(p_key, 200), w, 1)
  on conflict (key, window_start) do update set hits = public.rate_buckets.hits + 1
  returning hits into n;
  if random() < 0.01 then
    delete from public.rate_buckets where window_start < now() - interval '1 day';
  end if;
  return n <= p_limit;
end;
$$;
revoke all on function public.rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_hit(text, integer, integer) to service_role;
