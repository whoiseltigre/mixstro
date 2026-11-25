-- Ballots: only the server can write; one vote per browser per round; organizer control.
do $$
declare
  org text := encode(sha256('mixstro-ballot:org-browser'::bytea), 'hex');
  id uuid;
  r jsonb;
  voter uuid := gen_random_uuid();
  i int;
begin
  perform tests.anon();
  perform tests.denied(format('select public.name_ballot_vote(gen_random_uuid(), 1, gen_random_uuid(), 0)'), 'anon cannot vote directly', 'permission denied');
  perform tests.denied(format('select public.name_ballot_create(%L, %L)', '{A,B,C}', org), 'anon cannot create directly', 'permission denied');
  perform tests.login(gen_random_uuid());
  perform tests.denied(format('select public.name_ballot_vote(gen_random_uuid(), 1, gen_random_uuid(), 0)'), 'members cannot vote directly', 'permission denied');

  perform tests.service();
  id := public.name_ballot_create('{Alpha,Bravo,Charlie}', org);
  r := public.name_ballot_vote(id, 1, voter, 0);
  r := public.name_ballot_vote(id, 1, voter, 2);
  perform tests.ok((r->>'voters')::int = 1 and (r->'counts'->>2)::int = 1, 'a browser counts once and can change its pick');
  perform tests.denied(format('select public.name_ballot_round(%L, 1, %L, %L, %L)', id, repeat('b', 64), 'single', '{X,Y,Z}'), 'a different browser cannot open a round', 'not organizer');
  perform tests.denied(format('select public.name_ballot_round(%L, 1, null, %L, %L)', id, 'single', '{X,Y,Z}'), 'a missing organizer credential is refused', 'not organizer');
  r := public.name_ballot_round(id, 1, org, 'single', '{X,Y,Z}');
  perform tests.ok((r->>'round')::int = 2 and (r->>'organizer')::boolean, 'the organizer opens round 2');
  perform tests.denied(format('select public.name_ballot_vote(%L, 1, gen_random_uuid(), 0)', id), 'a vote for a closed round is refused', 'stale round');

  -- One busy organizer can't take the whole hourly allowance.
  for i in 1..19 loop perform public.name_ballot_create('{Alpha,Bravo,Charlie}', org); end loop;
  perform tests.denied(format('select public.name_ballot_create(%L, %L)', '{Alpha,Bravo,Charlie}', org), 'per-organizer budget', 'busy: caller');
  perform tests.ok(public.name_ballot_create('{Alpha,Bravo,Charlie}', repeat('c', 64)) is not null, 'another organizer still can');

  -- Limiter.
  for i in 1..3 loop perform tests.ok(public.rate_hit('t:a', 3, 60), 'within budget ' || i); end loop;
  perform tests.ok(not public.rate_hit('t:a', 3, 60), 'over budget');
  perform tests.ok(public.rate_hit('t:b', 3, 60), 'other callers unaffected');
end $$;
