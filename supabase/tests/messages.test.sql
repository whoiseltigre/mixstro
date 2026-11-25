-- Messages, inbox, signup, jams and notification intents (handoff PR 3).
do $$
declare
  a uuid := tests.musician('m_a', '{Bass}');
  b uuid := tests.musician('m_b', '{Drums}');
  q uuid := tests.musician('m_quiet', '{Keys}');
  busy bigint := tests.connect(a, b);
  quiet bigint := tests.connect(a, q);
  send uuid := gen_random_uuid();
  newest bigint;
  n bigint;
  jam bigint;
  r record;
begin
  -- A lost acknowledgment and a retry make one message; the same words on purpose make two.
  perform tests.login(a);
  insert into public.messages (connection_id, sender_id, body, client_id) values (busy, a, 'See you Thursday', send);
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, body, client_id) values (%s, %L, %L, %L)', busy, a, 'See you Thursday', send),
    'a retry with the same send id is refused', 'duplicate key');
  insert into public.messages (connection_id, sender_id, body, client_id) values (busy, a, 'See you Thursday', gen_random_uuid());
  perform tests.ok(tests.rows(format('select 1 from public.messages where connection_id = %s and body = %L', busy, 'See you Thursday')) = 2,
    'two intentional identical texts are two messages');
  insert into public.messages (connection_id, sender_id, body) values (busy, a, 'older app, no send id');

  -- 501+ messages: newest first with an id tie-break, and a busy thread can't hide a quiet one.
  reset role;
  insert into public.messages (connection_id, sender_id, body, created_at)
  select busy, b, 'busy ' || i, now() - interval '1 day' + make_interval(secs => i) from generate_series(1, 600) i;
  insert into public.messages (connection_id, sender_id, body, created_at) values (quiet, q, 'quiet hello', now() - interval '3 days');
  insert into public.messages (connection_id, sender_id, body, created_at) values (busy, b, 'tie 1', now() + interval '1 minute'), (busy, b, 'tie 2', now() + interval '1 minute');
  perform tests.login(a);
  select id into newest from public.messages where connection_id = busy order by created_at desc, id desc limit 1;
  perform tests.ok((select body from public.messages where id = newest) = 'tie 2', 'newest first, id breaks ties');
  perform tests.ok(tests.rows(format('select 1 from public.latest_messages(array[%s, %s])', busy, quiet)) = 2, 'latest per thread keeps the quiet thread');
  perform tests.ok((select body from public.latest_messages(array[quiet]::bigint[])) = 'quiet hello', 'quiet thread shows its own latest');
  -- Paging back to the oldest by cursor.
  select count(*) into n from public.messages where connection_id = busy and (created_at, id) < ((select created_at from public.messages where id = newest), newest);
  perform tests.ok(n = 604, 'cursor reaches every older message');
  perform tests.login(q);
  perform tests.ok(tests.rows(format('select 1 from public.latest_messages(array[%s])', busy)) = 0, 'latest_messages respects who can read');

  -- Another time: both halves or neither.
  perform tests.login(b);
  insert into public.jams (connection_id, proposed_by, starts_at, place) values (busy, b, now() + interval '2 days', 'Studio A') returning id into jam;
  perform tests.denied(format('select public.reschedule_jam(%s, now() + interval ''3 days'', %L)', jam, 'My place'), 'the proposer cannot "another time" their own invite');
  perform tests.denied(format('select public.reschedule_jam(%s, now() + interval ''3 days'', %L)', jam, 'x'), 'an invalid new invite is refused', 'already answered|check');
  perform tests.login(a);
  perform tests.denied(format('select public.reschedule_jam(%s, now() + interval ''3 days'', %L)', jam, 'x'), 'a too-short place fails the insert', 'check');
  perform tests.ok((select status from public.jams where id = jam) = 'proposed', 'a failed reschedule keeps the original invite');
  perform public.reschedule_jam(jam, now() + interval '3 days', 'Practice Space', 'Earlier?');
  perform tests.ok((select status from public.jams where id = jam) = 'replaced' and tests.rows(format('select 1 from public.jams where replaces_id = %s', jam)) = 1,
    'a reschedule replaces and proposes together');

  -- Signup saves everything or nothing.
  reset role;
  insert into auth.users (id) values ('bbbbbbbb-0000-4000-8000-000000000009');
  perform tests.login('bbbbbbbb-0000-4000-8000-000000000009');
  perform tests.denied($q$select public.finish_onboarding('{"first_name":"Nia","username":"nia_drums","adult_confirmed_at":"2026-11-25T00:00:00Z","instruments":["Drums"]}',
    '[{"artist_id":"a","artist_name":"A"}]', '[{"kind":"not-a-kind","url":"x"}]')$q$, 'a bad clip fails the whole signup');
  perform tests.ok(tests.rows('select 1 from public.profiles where username = ''nia_drums''') = 0, 'nothing from the failed signup was kept');
  perform public.finish_onboarding('{"first_name":"Nia","username":"nia_drums","adult_confirmed_at":"2026-11-25T00:00:00Z","instruments":["Drums"],"play_days":["thu"]}',
    '[{"artist_id":"a","artist_name":"A"},{"artist_id":"b","artist_name":"B"}]', '[{"kind":"clip","provider":"youtube","url":"https://youtu.be/x"}]');
  perform tests.ok((select onboarded_at is not null from public.profiles where username = 'nia_drums'), 'signup marks onboarded only after it all saves');
  perform tests.ok(tests.rows('select 1 from public.influences where profile_id = auth.uid()') = 2, 'influences saved with the profile');

  -- Signed out (expired session): no sends, no connects, no signup.
  perform tests.anon();
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, body) values (%s, %L, %L)', busy, a, 'x'), 'signed out cannot send');
  perform tests.denied(format('select public.request_connection(%L, %L)', b, 'hello'), 'signed out cannot connect');
  perform tests.login(null);
  perform tests.denied($q$select public.finish_onboarding('{}', '[]')$q$, 'no session cannot finish signup', 'sign in');

  -- Notification intents: written with the message, claimed once, drained in pages.
  reset role;
  perform tests.ok(tests.rows(format('select 1 from public.notification_intents where event_key = ''message:%s'' and recipient_id = %L', newest, a)) = 1,
    'each message records one intent for the other person');
  perform tests.service();
  perform tests.ok(tests.rows(format('select 1 from public.claim_notification_intents(1, %L)', 'message:' || newest)) = 1, 'first worker claims it');
  perform tests.ok(tests.rows(format('select 1 from public.claim_notification_intents(1, %L)', 'message:' || newest)) = 0, 'a second worker gets nothing');
  update public.notification_intents set status = 'sent' where status = 'pending';
  insert into public.notification_intents (event_key, recipient_id) select 'test:' || i, a from generate_series(1, 120) i;
  for r in select 1 from generate_series(1, 3) loop perform public.claim_notification_intents(50); end loop;
  perform tests.ok(tests.rows('select 1 from public.notification_intents where event_key like ''test:%'' and status = ''pending''') = 0, 'a backlog bigger than one batch drains');
  perform tests.login(a);
  perform tests.denied('select 1 from public.claim_notification_intents(1)', 'members cannot claim intents', 'permission denied');
end $$;
