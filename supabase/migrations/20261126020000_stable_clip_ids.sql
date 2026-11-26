-- Editing your music in signup no longer gives every clip a new id. Clips you kept stay the
-- same row, so replies that point at them ("at 1:23 in your clip") keep working. Only the clip
-- step of finish_onboarding changes. Safe to run more than once.

create or replace function public.finish_onboarding(p_profile jsonb, p_influences jsonb, p_clips jsonb default null)
returns void language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_influences) <> 'array' or jsonb_array_length(p_influences) > 30 then raise exception 'invalid influences'; end if;
  if p_clips is not null and (jsonb_typeof(p_clips) <> 'array' or jsonb_array_length(p_clips) > 12) then raise exception 'invalid clips'; end if;

  insert into public.profiles (id, first_name, username, adult_confirmed_at, avatar_url, instruments, main_instrument, level,
    genres, music_source, goals, commitment, neighborhood, radius_mi, play_days)
  values (
    me,
    p_profile->>'first_name',
    p_profile->>'username',
    (p_profile->>'adult_confirmed_at')::timestamptz,
    p_profile->>'avatar_url',
    coalesce(array(select jsonb_array_elements_text(p_profile->'instruments')), '{}'),
    p_profile->>'main_instrument',
    p_profile->>'level',
    coalesce(array(select jsonb_array_elements_text(p_profile->'genres')), '{}'),
    p_profile->>'music_source',
    coalesce(array(select jsonb_array_elements_text(p_profile->'goals')), '{}'),
    coalesce((p_profile->>'commitment')::smallint, 1),
    p_profile->>'neighborhood',
    coalesce((p_profile->>'radius_mi')::smallint, 25),
    coalesce(array(select jsonb_array_elements_text(p_profile->'play_days')), '{}')
  )
  on conflict (id) do update set
    first_name = excluded.first_name, username = excluded.username,
    adult_confirmed_at = coalesce(excluded.adult_confirmed_at, profiles.adult_confirmed_at),
    avatar_url = excluded.avatar_url, instruments = excluded.instruments, main_instrument = excluded.main_instrument,
    level = excluded.level, genres = excluded.genres, music_source = excluded.music_source, goals = excluded.goals,
    commitment = excluded.commitment, neighborhood = excluded.neighborhood, radius_mi = excluded.radius_mi,
    play_days = excluded.play_days;

  delete from public.influences where profile_id = me;
  insert into public.influences (profile_id, artist_id, artist_name, image_url, source, rank)
  select me, i->>'artist_id', i->>'artist_name', i->>'image_url', coalesce(i->>'source', 'manual'), (ord - 1)::smallint
  from jsonb_array_elements(p_influences) with ordinality as t(i, ord);

  -- Null keeps the clips you have; an array becomes your set. Clips you kept (same kind and
  -- link) keep their ids, so clip replies in chats still point at them; only removed ones go
  -- and only new ones are added.
  if p_clips is not null and jsonb_array_length(p_clips) > 0 then
    delete from public.clips k
    where k.profile_id = me
      and not exists (
        select 1 from jsonb_array_elements(p_clips) c
        where c->>'kind' = k.kind and c->>'url' = k.url
      );
    insert into public.clips (profile_id, kind, provider, url)
    select distinct on (c->>'kind', c->>'url') me, c->>'kind', c->>'provider', c->>'url'
    from jsonb_array_elements(p_clips) c
    where not exists (
      select 1 from public.clips k where k.profile_id = me and k.kind = c->>'kind' and k.url = c->>'url'
    );
  end if;

  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = me;
end;
$$;
revoke all on function public.finish_onboarding(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.finish_onboarding(jsonb, jsonb, jsonb) to authenticated;
