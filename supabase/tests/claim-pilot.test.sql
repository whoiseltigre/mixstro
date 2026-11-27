-- Claim pilot (20261127000000): unclaimed band pages, claims with a code, Pulse approval, removal.
do $$
declare
  admin uuid := tests.musician('t_cp_admin');
  carson uuid := tests.musician('t_cp_carson', '{Guitar}');
  jack uuid := tests.musician('t_cp_jack', '{Bass}');
  rando uuid := tests.musician('t_cp_rando', '{Keys}');
  band bigint; other bigint; s1 bigint; s2 bigint; c jsonb; c2 jsonb; page jsonb; n int;
begin
  insert into public.pulse_viewers (profile_id) values (admin);
  insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url)
  values ('The Test Wild', 'Indianapolis, IN', '{pop rock}', 'unclaimed', 'musicbrainz', '{"mbid":"x","first_year":2016}', 'https://www.instagram.com/test_wild/')
  returning id into band;
  insert into public.band_seats (band_id, name, role, rank) values (band, 'Carson', 'vocals, guitar', 0) returning id into s1;
  insert into public.band_seats (band_id, name, role, rank) values (band, 'Jack', 'bass', 1) returning id into s2;
  insert into public.bands (name, claim_state) values ('Gone Soon', 'unclaimed') returning id into other;

  -- Signed out: the unclaimed page reads, public_band doesn't, removal can be asked.
  perform tests.anon();
  page := public.unclaimed_band(band);
  perform tests.ok(page ->> 'name' = 'The Test Wild' and jsonb_array_length(page -> 'seats') = 2, 'anon reads the unclaimed page with its lineup');
  perform tests.ok(page -> 'my_claim' = 'null'::jsonb or page -> 'my_claim' is null, 'no claim when signed out');
  perform tests.ok(public.public_band(band) is null, 'public_band stays null without members');
  perform tests.denied(format('select public.start_claim(%s)', band), 'anon cannot claim');
  perform public.request_band_removal(other, 'band@example.test', 'not us');
  perform tests.denied('select 1 from public.band_seats', 'anon cannot read seats directly');
  perform tests.denied('select 1 from public.band_claims', 'anon cannot read claims');

  -- Carson claims the band through his seat; asking again returns the same code.
  perform tests.login(carson);
  c := public.start_claim(band, s1);
  perform tests.ok(c ->> 'code' ~ '^MIX-[A-F0-9]{6}$', 'claim gets a code');
  c2 := public.start_claim(band, s1);
  perform tests.ok(c2 ->> 'code' = c ->> 'code', 'same open claim on retry');
  perform tests.denied(format('select public.submit_claim_proof(%s, %L)', (c ->> 'id')::bigint, 'javascript:alert(1)'), 'proof must be a web link');
  perform public.submit_claim_proof((c ->> 'id')::bigint, 'https://www.instagram.com/p/abc/');
  perform tests.ok(public.unclaimed_band(band) -> 'my_claim' ->> 'proof_url' = 'https://www.instagram.com/p/abc/', 'claimant sees their own claim');
  perform tests.denied(format('select public.decide_claim(%s, true)', (c ->> 'id')::bigint), 'claimant cannot approve themselves', 'not allowed');
  perform tests.ok(public.claim_queue() is null, 'non-admins get no queue');

  -- Pulse viewer approves: Carson is a member, the page is claimed, normal page takes over.
  perform tests.login(admin);
  perform tests.ok(jsonb_array_length(public.claim_queue() -> 'claims') = 1, 'claim shows in the queue');
  perform tests.ok(jsonb_array_length(public.claim_queue() -> 'removals') = 1, 'removal shows in the queue');
  perform public.decide_claim((c ->> 'id')::bigint, true);
  reset role;
  perform tests.ok((select claim_state from public.bands where id = band) = 'claimed', 'band is claimed');
  perform tests.ok(exists (select 1 from public.band_members bm join public.projects p on p.id = bm.project_id
    where bm.band_id = band and bm.profile_id = carson and p.start_year = 2016 and p.role = 'vocals, guitar'), 'Carson is a member with a project from the seat');
  perform tests.ok((select claimed_by from public.band_seats where id = s1) = carson, 'seat is his');
  perform tests.anon();
  perform tests.ok(public.unclaimed_band(band) is null, 'unclaimed read is gone once claimed');
  perform tests.ok(public.public_band(band) ->> 'name' = 'The Test Wild', 'public_band shows it now');

  -- Jack claims his seat; Carson (a member now) approves it. Outsiders can't.
  perform tests.login(jack);
  perform tests.ok(jsonb_array_length(public.band_open_seats(band) -> 'seats') = 1, 'one open seat left');
  perform tests.denied(format('select public.start_claim(%s)', band), 'a claimed band needs a seat', 'pick your name');
  c := public.start_claim(band, s2);
  perform tests.login(rando);
  perform tests.denied(format('select public.decide_claim(%s, true)', (c ->> 'id')::bigint), 'outsiders cannot approve', 'not allowed');
  perform tests.denied(format('select public.start_claim(%s, %s)', band, s1), 'a claimed seat is taken', 'taken');
  perform tests.login(carson);
  perform public.decide_claim((c ->> 'id')::bigint, true);
  perform tests.ok(public.is_band_member(band, jack), 'Jack is in');

  -- Removal: admin takes the other page down; claimed pages can't be removed this way.
  perform tests.login(admin);
  select (r ->> 'id')::bigint into n from jsonb_array_elements(public.claim_queue() -> 'removals') r limit 1;
  perform public.resolve_band_removal(n, true);
  reset role;
  perform tests.ok(not exists (select 1 from public.bands where id = other), 'unclaimed page removed');
  perform tests.anon();
  perform tests.denied(format('select public.request_band_removal(%s)', band), 'claimed pages are not removable by request', 'no such page');
end $$;
