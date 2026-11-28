-- Public opening links: explicit sharing, only cleared media, nothing private, real status.
do $$
declare
  bass uuid := tests.musician('l_bass', '{Electric bass}', '{Tue,Thu}');
  drum uuid := tests.musician('l_drum', '{Drum kit}');
  clip bigint;
  other_clip bigint;
  post bigint;
  j jsonb;
begin
  select id into clip from public.clips where profile_id = bass limit 1;
  select id into other_clip from public.clips where profile_id = drum limit 1;
  perform tests.login(bass);
  insert into public.board_posts (author_id, kind, title, needed_role, needed_instruments, offered_role, neighborhood)
  values (bass, 'band_seeking', 'Drummer wanted', 'Drums', '{Drum kit}', 'Bass', 'South Austin, near 1st and Oltorf') returning id into post;

  perform tests.anon();
  perform tests.ok(public.public_opening(post) is null, 'not public until the poster shares it');

  perform tests.login(bass);
  perform tests.denied(format('update public.board_posts set share_clip_id = %s where id = %s', other_clip, post), 'cannot share someone else''s clip', 'own clips');
  update public.board_posts set shared_at = now(), share_clip_id = clip where id = post;

  perform tests.anon();
  j := public.public_opening(post);
  perform tests.ok(j->>'status' = 'open' and (j->'clip'->>'id')::bigint = clip, 'signed-out visitors see the opening and its cleared clip');
  perform tests.ok(j->>'area' = 'South Austin', 'only the approximate area is public');
  perform tests.ok(not (j::text ~* 'lat|lng|email|oltorf'), 'no coordinates, contact details or street');
  perform tests.denied(format('select public.opening_link_count(%s, %L)', post, 'open'), 'anon cannot write counts directly', 'permission denied');

  perform tests.login(bass);
  perform public.set_opening_status(post, 'filled');
  perform tests.anon();
  perform tests.ok(public.public_opening(post)->>'status' = 'filled', 'a filled opening says so on its link');

  -- A blocked visitor can still see a public page (it's public), but cannot answer it.
  reset role;
  perform public.set_opening_status(post, 'open') from (select tests.login(bass)) x;
  reset role;
  insert into public.blocks (blocker_id, blocked_id) values (bass, drum);
  perform tests.login(drum);
  perform tests.denied(format('insert into public.board_replies (post_id, from_id, note, source) values (%s, %L, %L, %L)', post, drum, 'hi', 'link'),
    'a blocked person cannot answer', 'row-level security');
end $$;
