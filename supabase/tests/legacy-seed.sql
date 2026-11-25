-- Synthetic rows shaped like production data at PROD_BASELINE (see scripts/db-test.mjs), so new
-- migrations are rehearsed against existing rows, not just an empty database. No real people.
do $$
declare
  a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  b uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  c uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  conn bigint;
  post bigint;
  proj bigint;
  band bigint;
begin
  insert into auth.users (id, email) values (a, 'legacy-a@example.test'), (b, 'legacy-b@example.test'), (c, 'legacy-c@example.test');
  insert into public.profiles (id, first_name, username, birthday, instruments, main_instrument, neighborhood, play_days, onboarded_at)
  values (a, 'Lena', 'legacy_lena', '1990-01-01', '{Bass}', 'Bass', 'South Austin, TX', '{tue,thu}', now() - interval '20 days');
  insert into public.profiles (id, first_name, username, adult_confirmed_at, instruments, main_instrument, neighborhood, play_days, onboarded_at)
  values (b, 'Dev', 'legacy_dev', now(), '{Drums}', 'Drums', 'East Austin, TX', '{thu}', now() - interval '10 days'),
         (c, 'Half', 'legacy_half', now(), '{}', null, null, '{}', null); -- signup never finished
  insert into public.profile_locations (profile_id, lat, lng, place) values (a, 30.22, -97.77, 'South Austin, TX'), (b, 30.26, -97.72, 'East Austin, TX');
  insert into public.influences (profile_id, artist_id, artist_name, rank) values (a, 'khruangbin', 'Khruangbin', 0), (b, 'khruangbin', 'Khruangbin', 0);
  insert into public.clips (profile_id, kind, url) values (a, 'clip', 'https://youtu.be/legacy-a'), (b, 'clip', 'https://youtu.be/legacy-b');

  insert into public.connections (from_id, to_id, status, note) values (a, b, 'accepted', 'Love your groove') returning id into conn;
  -- Old clients sent messages with no send id; history must survive.
  insert into public.messages (connection_id, sender_id, body, created_at)
  select conn, case when i % 2 = 0 then a else b end, 'legacy message ' || i, now() - make_interval(mins => 600 - i)
  from generate_series(1, 40) i;
  insert into public.messages (connection_id, sender_id, voice_url, voice_seconds) values (conn, a, conn || '/' || a || '/note.webm', 12);
  insert into public.jams (connection_id, proposed_by, starts_at, place) values (conn, a, now() + interval '3 days', 'Practice Space');

  insert into public.board_posts (author_id, kind, title, details, role, neighborhood)
  values (a, 'band_seeking', 'Need a drummer', 'Soul trio, Tuesdays', 'Drummer', 'South Austin') returning id into post;
  insert into public.board_posts (author_id, kind, title, role, closed_at) values (a, 'session', 'Old closed gig', 'Keys', now() - interval '5 days');
  insert into public.board_replies (post_id, from_id, note) values (post, b, 'I can do Tuesdays');

  insert into public.projects (profile_id, name, role, start_year) values (a, 'The Lows', 'Bass', 2020) returning id into proj;
  insert into public.bands (name, created_by) values ('The Lows', a) returning id into band;
  insert into public.band_members (band_id, profile_id, project_id) values (band, a, proj);
  insert into public.band_messages (band_id, sender_id, kind, body) values (band, a, 'text', 'legacy band hello');

  insert into public.name_ballots (organizer_hash, options) values (repeat('a', 64), '{One,Two,Three}');
end $$;
