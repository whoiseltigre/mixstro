-- Test helpers: act as a signed-in person, a signed-out visitor or the server, and assert.
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Every test runs inside begin … rollback, so these settings end with the test.
create or replace function tests.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

create or replace function tests.service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end $$;

create or replace function tests.ok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then raise exception 'not ok - %', p_label; end if;
  raise notice 'ok - %', p_label;
end $$;

-- Runs p_sql as the current role and passes only if it fails (optionally with a matching message).
create or replace function tests.denied(p_sql text, p_label text, p_match text default null) returns void language plpgsql as $$
declare
  msg text;
begin
  begin
    execute p_sql;
  exception when others then
    msg := sqlerrm;
    if p_match is not null and msg !~* p_match then
      raise exception 'not ok - % (failed for another reason: %)', p_label, msg;
    end if;
    raise notice 'ok - % (denied: %)', p_label, msg;
    return;
  end;
  raise exception 'not ok - % (was allowed)', p_label;
end $$;

-- A finished musician. Runs as the database owner (call before tests.login).
create or replace function tests.musician(p_username text, p_instruments text[] default '{Guitar}', p_days text[] default '{}',
  p_neighborhood text default 'South Austin, TX', p_lat double precision default 30.22, p_lng double precision default -97.77,
  p_active interval default interval '1 hour') returns uuid language plpgsql as $$
declare
  uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (uid, p_username || '@example.test');
  insert into public.profiles (id, first_name, username, instruments, main_instrument, neighborhood, play_days, onboarded_at, last_active_at, adult_confirmed_at)
  values (uid, initcap(p_username), p_username, p_instruments, p_instruments[1], p_neighborhood, p_days, now() - interval '1 day', now() - p_active, now());
  if p_lat is not null then
    insert into public.profile_locations (profile_id, lat, lng, place) values (uid, p_lat, p_lng, p_neighborhood);
  end if;
  insert into public.clips (profile_id, kind, url) values (uid, 'clip', 'https://youtu.be/' || p_username);
  return uid;
end $$;

-- An accepted connection between two people, made as the owner.
create or replace function tests.connect(a uuid, b uuid) returns bigint language sql as $$
  insert into public.connections (from_id, to_id, status) values (a, b, 'accepted') returning id;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Rows a query returns as the current role (RLS hides rows rather than raising).
create or replace function tests.rows(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end $$;
grant execute on function tests.rows(text) to anon, authenticated, service_role;
