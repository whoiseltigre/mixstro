-- Band habit (20261126010000): rehearsals with who's in, setlists. Members only.
do $$
declare
  a uuid := tests.musician('t_bh_a', '{Bass}');
  b uuid := tests.musician('t_bh_b', '{Drums}');
  outsider uuid := tests.musician('t_bh_x', '{Keys}');
  pa bigint; pb bigint; band bigint; rid bigint; n int; sid bigint; songs text[];
begin
  insert into public.projects (profile_id, name, start_year) values (a, 'Night Owls', 2024) returning id into pa;
  insert into public.projects (profile_id, name, start_year) values (b, 'Night Owls', 2024) returning id into pb;
  insert into public.bands (name, created_by) values ('Night Owls', a) returning id into band;
  insert into public.band_members (band_id, profile_id, project_id) values (band, a, pa), (band, b, pb);

  -- Weekly for 4 weeks: 4 rehearsals, the planner is in for each, one chat line.
  perform tests.login(a);
  n := public.plan_rehearsals(band, now() + interval '2 days', 'Lucky Lou''s Room B', 'Bring the new one', 4);
  perform tests.ok(n = 4, 'weekly plan makes 4 rehearsals');
  perform tests.ok((select count(*) from public.band_rehearsals where band_id = band) = 4, 'members see all 4');
  perform tests.ok((select count(*) from public.band_rehearsal_rsvps where profile_id = a) = 4, 'the planner is in for each');
  perform tests.ok((select count(*) from public.band_messages where band_id = band and kind = 'rehearsal') = 1, 'one line in the band chat');
  select id into rid from public.band_rehearsals where band_id = band order by starts_at limit 1;

  -- A bandmate answers for themselves only.
  perform tests.login(b);
  insert into public.band_rehearsal_rsvps (rehearsal_id, profile_id, answer) values (rid, b, 'out');
  update public.band_rehearsal_rsvps set answer = 'in' where rehearsal_id = rid and profile_id = b;
  perform tests.denied(format('insert into public.band_rehearsal_rsvps (rehearsal_id, profile_id, answer) values (%s, %L, %L)', rid + 1, a, 'out'),
    'cannot answer for someone else', 'row-level security');
  perform tests.ok((select answer from public.band_rehearsal_rsvps where rehearsal_id = rid and profile_id = b) = 'in', 'answer can change');

  -- Setlists: cleaned on save.
  insert into public.band_setlists (band_id, name, songs, updated_by) values (band, 'Friday at the Hole', array['  Opener ', '', 'Closer'], b) returning id, band_setlists.songs into sid, songs;
  perform tests.ok(songs = array['Opener', 'Closer'], 'song titles are trimmed and blanks dropped');

  -- Outsiders see nothing and can't plan.
  perform tests.login(outsider);
  perform tests.ok(tests.rows('select 1 from public.band_rehearsals') = 0, 'outsiders cannot see rehearsals');
  perform tests.ok(tests.rows('select 1 from public.band_setlists') = 0, 'outsiders cannot see setlists');
  perform tests.denied(format('select public.plan_rehearsals(%s, now() + interval ''1 day'', %L)', band, 'Garage'), 'outsiders cannot plan', 'not in this band');
  perform tests.denied(format('insert into public.band_setlists (band_id, name, updated_by) values (%s, %L, %L)', band, 'Mine', outsider), 'outsiders cannot add setlists', 'row-level security');

  -- Direct inserts skip the chat line, so they're closed.
  perform tests.login(a);
  perform tests.denied(format('insert into public.band_rehearsals (band_id, starts_at, place) values (%s, now() + interval ''1 day'', %L)', band, 'Garage'),
    'rehearsals are added through plan_rehearsals', 'row-level security');
  perform tests.denied(format('select public.plan_rehearsals(%s, now() - interval ''2 days'', %L)', band, 'Garage'), 'no rehearsals in the past', 'pick a time');

  perform tests.anon();
  perform tests.denied(format('select public.plan_rehearsals(%s, now() + interval ''1 day'', %L)', band, 'Garage'), 'signed out cannot plan', 'permission');
end $$;
