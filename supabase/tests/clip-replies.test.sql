-- Clip replies on messages (handoff PR 6).
do $$
declare
  a uuid := tests.musician('cr_a', '{Bass}');
  b uuid := tests.musician('cr_b', '{Drums}');
  x uuid := tests.musician('cr_x', '{Keys}');
  ab bigint := tests.connect(a, b);
  theirs bigint;
  mine bigint;
  stranger bigint;
  band bigint;
  send uuid := gen_random_uuid();
  m bigint;
begin
  reset role;
  insert into public.clips (profile_id, kind, provider, url, duration_s) values (b, 'clip', 'youtube', 'https://youtu.be/aaaaaaaaaaa', 200) returning id into theirs;
  insert into public.clips (profile_id, kind, provider, url) values (a, 'clip', 'soundcloud', 'https://soundcloud.com/a/b') returning id into mine;
  insert into public.clips (profile_id, kind, provider, url) values (x, 'clip', 'youtube', 'https://youtu.be/bbbbbbbbbbb') returning id into stranger;
  insert into public.clips (profile_id, kind, url) values (b, 'band', 'The Low Tides') returning id into band;

  perform tests.login(a);
  -- Their clip at a moment, no text; your own clip with text.
  insert into public.messages (connection_id, sender_id, clip_id, clip_at, client_id) values (ab, a, theirs, 83, send) returning id into m;
  perform tests.ok((select clip_at from public.messages where id = m) = 83, 'reply to their clip at 1:23 with no text');
  insert into public.messages (connection_id, sender_id, body, clip_id) values (ab, a, 'this is me last week', mine);
  perform tests.ok(tests.rows(format('select 1 from public.messages where connection_id = %s and clip_id = %s', ab, mine)) = 1, 'share your own clip with a note');

  -- Same send id = one message, attachment included.
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, clip_id, clip_at, client_id) values (%s, %L, %s, 83, %L)', ab, a, theirs, send),
    'a retried clip reply stays one message', 'duplicate key');

  -- Not someone else's clip, not a band name, not past the end, not a moment without a clip.
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, clip_id) values (%s, %L, %s)', ab, a, stranger),
    'a clip from outside the conversation is refused', 'not available');
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, clip_id) values (%s, %L, %s)', ab, a, band),
    'a band entry is not a clip', 'not available');
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, clip_id, clip_at) values (%s, %L, %s, 201)', ab, a, theirs),
    'a moment past the end is refused', 'past the end');
  perform tests.denied(format('insert into public.messages (connection_id, sender_id, body, clip_at) values (%s, %L, %L, 5)', ab, a, 'hi'),
    'a moment needs a clip', 'clip_at');
  perform tests.denied(format('insert into public.messages (connection_id, sender_id) values (%s, %L)', ab, a),
    'an empty message is still refused', 'has_content');
  -- Unknown length: any moment up to the cap.
  insert into public.messages (connection_id, sender_id, clip_id, clip_at) values (ab, a, mine, 600);

  -- Removing the clip leaves the conversation readable.
  reset role;
  delete from public.clips where id = theirs;
  perform tests.login(b);
  perform tests.ok(tests.rows(format('select 1 from public.messages where id = %s', m)) = 1, 'reply survives its clip being removed');
  perform tests.ok(tests.rows(format('select 1 from public.clips where id = %s', theirs)) = 0, 'removed clip resolves to nothing (shown as unavailable)');
  perform tests.ok((select body is null and voice_url is null from public.latest_messages(array[ab]::bigint[])), 'inbox sees the latest as a clip reply (no text, no voice)');

  -- Older rows and plain sends are unchanged.
  perform tests.login(a);
  insert into public.messages (connection_id, sender_id, body) values (ab, a, 'plain text still works');
end $$;
