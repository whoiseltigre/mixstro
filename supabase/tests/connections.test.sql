-- Consent: crossed requests converge, only the person asked can accept, blocks stop everything.
do $$
declare
  bass uuid := tests.musician('t_bass', '{Bass}');
  drum uuid := tests.musician('t_drum', '{Drums}');
  other uuid := tests.musician('t_other', '{Keys}');
  r jsonb;
  n int;
  cid bigint;
begin
  -- Both ask at once: one row, connected.
  perform tests.login(bass);
  r := public.request_connection(drum, 'Want to jam?');
  perform tests.ok(r->>'outcome' = 'sent', 'first request is sent');
  perform tests.login(drum);
  r := public.request_connection(bass, 'Yes!');
  perform tests.ok(r->>'outcome' = 'accepted', 'crossed request accepts');
  reset role;
  select count(*) into n from public.connections where least(from_id, to_id) = least(bass, drum) and greatest(from_id, to_id) = greatest(bass, drum);
  perform tests.ok(n = 1, 'crossed requests leave one connection');
  select id into cid from public.connections where least(from_id, to_id) = least(bass, drum) and greatest(from_id, to_id) = greatest(bass, drum);

  -- Only the person asked can accept.
  perform tests.login(bass);
  r := public.request_connection(other, 'Hey there');
  execute format('update public.connections set status = %L where from_id = %L and to_id = %L', 'accepted', bass, other);
  reset role;
  perform tests.ok((select status from public.connections where from_id = bass and to_id = other) = 'pending',
    'the requester cannot accept their own request (row unchanged)');
  perform tests.login(drum);
  r := public.answer_connection(bass, true);
  perform tests.ok(r->>'outcome' = 'closed', 'an unrelated person cannot answer someone else''s request');
  reset role;
  perform tests.ok((select status from public.connections where from_id = bass and to_id = other) = 'pending', 'and the request is still open');

  -- Blocked pair: no connect, no message.
  reset role;
  insert into public.blocks (blocker_id, blocked_id) values (drum, bass);
  perform tests.login(bass);
  perform tests.denied(format('select public.request_connection(%L, %L)', drum, 'hello again'), 'blocked pair cannot connect', 'not available');
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, body) values (%s, %L, %L)', cid, bass, 'hi'),
    'blocked pair cannot message', 'row-level security');
  perform tests.ok(tests.rows('select 1 from public.connections where id = ' || cid) = 0, 'a blocked pair''s connection is hidden');
end $$;
