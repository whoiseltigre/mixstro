-- Core loop (20261126000000): Connect limits, verified-only, reply habits, remote lane, 30-day discovery.
do $$
declare
  me uuid := tests.musician('t_cl_me', '{Bass}');
  pick uuid := tests.musician('t_cl_pick', '{Drums}');
  far uuid := tests.musician('t_cl_far', '{Keys}', '{}', 'Brooklyn, NY', 40.68, -73.94);
  stale uuid := tests.musician('t_cl_stale', '{Drums}', '{}', 'South Austin, TX', 30.22, -97.77, interval '40 days');
  others uuid[] := '{}';
  r jsonb;
  s record;
  i int;
begin
  for i in 1..7 loop
    others := others || tests.musician('t_cl_o' || i, '{Guitar}');
  end loop;

  -- Five waiting at once, then a clear refusal.
  perform tests.login(me);
  for i in 1..5 loop
    r := public.request_connection(others[i], 'Want to jam?');
    perform tests.ok(r->>'outcome' = 'sent', 'connect ' || i || ' sends');
  end loop;
  perform tests.denied(format('select public.request_connection(%L, %L)', others[6], 'One more?'), 'a sixth waiting Connect is refused', 'too many waiting');

  -- Once one is answered, there is room again; a first-week account still has a daily cap of 5.
  perform tests.login(others[1]);
  r := public.answer_connection(me, true);
  perform tests.login(me);
  perform tests.denied(format('select public.request_connection(%L, %L)', others[6], 'One more?'), 'new accounts get 5 a day', 'daily limit');
  reset role;
  update public.profiles set onboarded_at = now() - interval '30 days', created_at = now() - interval '30 days' where id = me;
  perform tests.login(me);
  r := public.request_connection(others[6], 'One more?');
  perform tests.ok(r->>'outcome' = 'sent', 'an established account can send more in a day');

  -- Verified only.
  reset role;
  update public.profiles set connect_verified_only = true where id = pick;
  update public.connections set status = 'declined' where from_id = me and to_id in (others[2], others[3]);
  perform tests.login(me);
  perform tests.denied(format('select public.request_connection(%L, %L)', pick, 'Hi!'), 'unverified cannot reach verified-only', 'verified only');

  -- Reply habits: others[1] answered; others[2..3] declined (answered); others[4..5] still inside 48h (not counted yet).
  reset role;
  update public.connections set created_at = now() - interval '3 days' where from_id = me and to_id = others[4];
  perform tests.login(pick);
  select * into s from public.reply_stats(array[others[1], others[4]]) where profile_id = others[1];
  perform tests.ok(s.asked = 1 and s.answered = 1, 'answered Connect counts');
  select * into s from public.reply_stats(array[others[4]]) where profile_id = others[4];
  perform tests.ok(s.asked = 1 and s.answered = 0, 'a Connect waiting 48h+ counts as unanswered');
  perform tests.ok(not exists (select 1 from public.reply_stats(array[others[5]])), 'a fresh Connect is not judged yet');

  -- Remote lane: only people open to remote, any distance, not already known.
  reset role;
  update public.profiles set open_to = '{remote}' where id in (far, others[7], others[1]);
  perform tests.login(pick);
  perform tests.ok((select count(*) from public.remote_candidates(30) where profile_id = far) = 1, 'someone far away who is open to remote shows');
  perform tests.ok((select count(*) from public.remote_candidates(30) where profile_id = others[2]) = 0, 'someone not open to remote does not');
  perform tests.login(me);
  perform tests.ok((select count(*) from public.remote_candidates(30) where profile_id = others[1]) = 0, 'people you already know are left out');

  -- 30-day discovery window.
  perform tests.login(pick);
  perform tests.ok((select count(*) from public.discoverable_profiles where id = stale) = 0, 'inactive 40 days: not discoverable');
  perform tests.ok((select count(*) from public.local_candidates(60) where profile_id = stale) = 0, 'and not a local candidate');

  -- Signed out: none of it.
  perform tests.anon();
  perform tests.denied('select * from public.reply_stats(array[]::uuid[])', 'signed out cannot read reply stats', 'permission');
  perform tests.denied('select * from public.remote_candidates(5)', 'signed out cannot list remote candidates', 'permission');
end $$;
