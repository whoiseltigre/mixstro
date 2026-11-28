-- Openings: local eligible selection, honest states, expiry, blocks, alerts (handoff PR 4).
do $$
declare
  bass uuid := tests.musician('o_bass', '{Electric bass}', '{Tue,Thu}');
  d1 uuid := tests.musician('o_drum_fit', '{Drum kit}', '{Thu}', 'East Austin, TX', 30.26, -97.72, interval '3 days');
  d2 uuid := tests.musician('o_drum_near', '{Percussion}', '{Sat}', 'Zilker, Austin', 30.27, -97.77, interval '5 days');
  keys uuid := tests.musician('o_keys', '{Piano}', '{Thu}');
  nowhere uuid := tests.musician('o_nowhere', '{Electric bass}', '{}', null, null, null);
  post bigint;
  dated bigint;
  lonely bigint;
  lost bigint;
  r record;
  ids uuid[];
  n int;
begin
  update public.profiles set alert_roles = '{Bass}' where id = d1;
  -- 220 drummers in Dallas who were active more recently than anyone in Austin.
  for n in 1..220 loop perform tests.musician('o_dallas_' || n, '{Drum kit}', '{Thu}', 'Dallas, TX', 32.78, -96.80, interval '1 minute'); end loop;
  insert into public.influences (profile_id, artist_id, artist_name) values (bass, 'khruangbin', 'Khruangbin'), (d2, 'khruangbin', 'Khruangbin');

  perform tests.login(bass);
  insert into public.board_posts (author_id, kind, title, role, needed_role, needed_instruments, offered_role, rehearsal_days, radius_mi)
  values (bass, 'band_seeking', 'Drummer for a soul trio', 'Drums', 'Drums', '{Drums,Drum kit,Percussion,Hand drums,Electronic drums}', 'Bass', '{Tue,Thu}', 15)
  returning id into post;
  perform tests.ok((select expires_at > now() + interval '13 days' and status = 'open' and closed_at is null from public.board_posts where id = post), 'an opening starts open with a 14-day expiry');

  select array_agg(profile_id order by ord) into ids from (select profile_id, row_number() over () ord from public.opening_candidates(post)) x;
  perform tests.ok(ids[1] = d1 and d2 = any (ids), 'local drummers survive 220 newer out-of-market accounts, reciprocal + shared day first');
  perform tests.ok(not exists (select 1 from unnest(ids) i join public.profiles p on p.id = i where p.username like 'o_dallas_%'), 'no out-of-market candidates');
  select * into r from public.opening_candidates(post) limit 1;
  perform tests.ok(r.reciprocal and r.shared_days = '{Thu}' and r.miles between 1 and 10, 'reasons: wants bass, both play Thursday, distance');

  -- Someone else can't read who your opening would reach.
  perform tests.login(keys);
  perform tests.denied(format('select * from public.opening_candidates(%s)', post), 'only the poster sees candidates', 'not yours');

  -- A drummer opening Today sees the local bassist even with 220 newer Dallas accounts.
  perform tests.login(d2);
  perform tests.ok(exists (select 1 from public.local_candidates(60) where profile_id = bass), 'Today: local filter happens before the limit');
  perform tests.ok(not exists (select 1 from public.local_candidates(60) l join public.profiles p on p.id = l.profile_id where p.username like 'o_dallas_%'), 'Today: out-of-market people are not local');

  -- Blocks: gone from candidates, alerts and the Board.
  reset role;
  insert into public.blocks (blocker_id, blocked_id) values (d2, bass);
  perform tests.login(bass);
  perform tests.ok(not exists (select 1 from public.opening_candidates(post) where profile_id = d2), 'a blocked drummer is not a candidate');
  perform tests.login(d2);
  perform tests.ok(tests.rows(format('select 1 from public.board_posts where id = %s', post)) = 0, 'a blocked person cannot read the post');
  reset role;
  perform tests.service();
  perform public.queue_opening_alerts();
  reset role;
  perform tests.ok(exists (select 1 from public.notification_intents where recipient_id = d1 and event_key like 'opening:%'), 'nearby drummer gets an opening alert');
  perform tests.ok(not exists (select 1 from public.notification_intents where recipient_id = d2 and event_key like 'opening:%'), 'blocked drummer gets no alert');
  perform tests.ok(not exists (select 1 from public.notification_intents i join public.profiles p on p.id = i.recipient_id where p.username like 'o_dallas_%'), 'out-of-market drummers get no alert');
  select count(*) into n from public.notification_intents where event_key like 'opening:%';
  perform tests.service();
  perform public.queue_opening_alerts();
  reset role;
  perform tests.ok((select count(*) from public.notification_intents where event_key like 'opening:%') = n, 'queuing again alerts nobody twice');

  -- Zero supply is measurable; unknown location is not zero supply.
  perform tests.login(bass);
  insert into public.board_posts (author_id, kind, title, needed_role, needed_instruments, offered_role)
  values (bass, 'band_seeking', 'Need a tuba', 'Horns', '{Tuba}', 'Bass') returning id into lonely;
  perform tests.ok(tests.rows(format('select 1 from public.opening_candidates(%s)', lonely)) = 0, 'nobody plays tuba nearby');
  reset role;
  perform tests.ok((select candidates from public.opening_supply where post_id = lonely) = 0, 'a request with no candidates is recorded');
  perform tests.login(nowhere);
  insert into public.board_posts (author_id, kind, title, needed_role, needed_instruments) values (nowhere, 'band_seeking', 'Need drums', 'Drums', '{Drum kit}') returning id into lost;
  perform tests.ok((select state from public.opening_candidates(lost)) = 'no_location', 'unknown location says so instead of "nobody"');

  -- Dated sub request expires the day after; expired and filled stop.
  perform tests.login(bass);
  insert into public.board_posts (author_id, kind, title, needed_role, needed_instruments, event_date)
  values (bass, 'session', 'Sub for Friday', 'Drums', '{Drum kit}', current_date + 3) returning id into dated;
  perform tests.ok((select expires_at::date = current_date + 4 from public.board_posts where id = dated), 'a dated request expires after its date');
  reset role;
  update public.board_posts set expires_at = now() - interval '1 minute' where id = dated;
  perform tests.service();
  perform tests.ok(public.expire_openings() >= 1, 'expired openings close');
  reset role;
  perform tests.ok((select status = 'expired' and closed_at is not null from public.board_posts where id = dated), 'expired is closed for older clients too');
  perform tests.login(bass);
  perform tests.ok((select state from public.opening_candidates(dated)) = 'closed', 'an expired opening has no candidates');
  perform public.renew_opening(dated, 7);
  perform tests.ok((select status = 'open' and closed_at is null from public.board_posts where id = dated), 'renewing reopens it');
  perform public.set_opening_status(post, 'filled');
  perform tests.ok((select state from public.opening_candidates(post)) = 'closed', 'a filled opening disappears');
  perform tests.denied(format('select public.renew_opening(%s)', post), 'filled stays filled', 'filled');
  -- An older client closing the post the old way marks it filled.
  update public.board_posts set closed_at = now() where id = lonely;
  perform tests.ok((select status from public.board_posts where id = lonely) = 'filled', 'closed_at from an older client means filled');
  reset role;
  perform tests.ok((select count(*) from public.opening_events where post_id = dated) >= 3, 'transitions are recorded');
end $$;
