-- Signed-out visitors (anon) can call only the public-page and ballot functions, and read no
-- member tables directly.
do $$
declare
  f record;
  allowed text[] := array['public_profile', 'public_band', 'band_invite', 'played_with', 'sitemap_entries',
    'push_endpoint_ok', 'name_ballot_options_ok', 'public_opening'];
  extra text[] := '{}';
begin
  for f in
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  loop
    if not f.proname = any (allowed) then extra := extra || f.proname::text; end if;
  end loop;
  perform tests.ok(cardinality(extra) = 0, 'anon can execute only public functions; extra: ' || array_to_string(extra, ', '));

  perform tests.anon();
  reset role;
  perform tests.connect(tests.musician('g_a'), tests.musician('g_b'));
  insert into public.messages (connection_id, sender_id, body) select id, from_id, 'secret' from public.connections limit 1;
  perform tests.anon();
  perform tests.ok(tests.rows('select 1 from public.messages') = 0, 'anon sees no messages');
  perform tests.ok(tests.rows('select 1 from public.connections') = 0, 'anon sees no connections');
  perform tests.ok(tests.rows('select 1 from public.profiles') = 0, 'anon sees no profiles directly');
  perform tests.denied('select 1 from public.account_deletions', 'anon cannot read account deletions');
end $$;
