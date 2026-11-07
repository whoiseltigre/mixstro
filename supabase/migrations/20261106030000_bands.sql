-- Bands: "Played with" means real bands, confirmed by both sides.
-- A band links the Projects of everyone who played in it. You tag a bandmate on one of
-- your projects; they get a "Confirm your spot" link; confirming adds the band to their
-- profile too. No one owns a band: every confirmed member counts the same.
-- Membership is only written by the functions below, so nobody can claim a band alone.

create table if not exists public.bands (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.band_members (
  band_id bigint not null references public.bands (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id bigint not null unique references public.projects (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (band_id, profile_id)
);
create index if not exists band_members_profile_idx on public.band_members (profile_id);

create table if not exists public.band_invites (
  id bigint generated always as identity primary key,
  band_id bigint not null references public.bands (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  -- Null for a link invite: whoever opens it and confirms becomes the bandmate.
  to_id uuid references public.profiles (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists band_invites_to_idx on public.band_invites (to_id) where status = 'pending';

alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.band_invites enable row level security;

drop policy if exists "read bands" on public.bands;
create policy "read bands" on public.bands for select to authenticated using (true);
drop policy if exists "read band members" on public.band_members;
create policy "read band members" on public.band_members for select to authenticated using (true);
-- Leave a band by removing yourself (deleting the project does the same).
drop policy if exists "leave a band" on public.band_members;
create policy "leave a band" on public.band_members for delete to authenticated using (profile_id = auth.uid());
drop policy if exists "see your band invites" on public.band_invites;
create policy "see your band invites" on public.band_invites for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
drop policy if exists "cancel your band invites" on public.band_invites;
create policy "cancel your band invites" on public.band_invites for delete to authenticated
  using (from_id = auth.uid() and status = 'pending');

-- Tag a bandmate on one of your projects. Makes the project a band on first use.
-- p_to: a member to invite directly; null makes a link anyone can confirm. Returns the token.
create or replace function public.invite_to_band(p_project bigint, p_to uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  proj public.projects;
  band bigint;
  tok text;
begin
  select * into proj from public.projects where id = p_project and profile_id = me;
  if proj.id is null then raise exception 'not your project'; end if;
  if p_to = me then raise exception 'that is you'; end if;
  if p_to is not null and public.is_blocked(me, p_to) then raise exception 'not available'; end if;

  select band_id into band from public.band_members where project_id = p_project;
  if band is null then
    insert into public.bands (name, created_by) values (proj.name, me) returning id into band;
    insert into public.band_members (band_id, profile_id, project_id) values (band, me, p_project);
  end if;

  if p_to is not null then
    if exists (select 1 from public.band_members where band_id = band and profile_id = p_to) then
      raise exception 'already in the band';
    end if;
    select token into tok from public.band_invites where band_id = band and to_id = p_to and status = 'pending';
    if tok is not null then return tok; end if;
  end if;

  -- A light brake on spam: 30 invites a day.
  if (select count(*) from public.band_invites where from_id = me and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many invites today';
  end if;
  insert into public.band_invites (band_id, from_id, to_id) values (band, me, p_to) returning token into tok;
  return tok;
end $$;

-- What a "Confirm your spot" link shows. Works signed out, so the link can bring people in.
create or replace function public.band_invite(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'band', b.name,
    'status', i.status,
    'for_someone_else', i.to_id is not null and i.to_id is distinct from auth.uid(),
    'from', jsonb_build_object('username', f.username, 'first_name', f.first_name, 'avatar_url', f.avatar_url),
    'start_year', p.start_year,
    'end_year', p.end_year,
    'members', (select count(*) from public.band_members m where m.band_id = b.id)
  )
  from public.band_invites i
  join public.bands b on b.id = i.band_id
  join public.profiles f on f.id = i.from_id
  left join public.band_members fm on fm.band_id = b.id and fm.profile_id = i.from_id
  left join public.projects p on p.id = fm.project_id
  where i.token = p_token;
$$;

-- Confirm your spot: the band joins your profile as a project (or links one you already
-- added with the same name). Returns your project id.
create or replace function public.accept_band_invite(p_token text, p_role text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv public.band_invites;
  b public.bands;
  theirs public.projects;
  mine bigint;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into inv from public.band_invites where token = p_token for update;
  if inv.id is null or inv.status <> 'pending' then raise exception 'this link is no longer open'; end if;
  if inv.to_id is not null and inv.to_id <> me then raise exception 'this invite is for someone else'; end if;
  if inv.from_id = me then raise exception 'that is your own invite'; end if;
  if public.is_blocked(me, inv.from_id) then raise exception 'not available'; end if;

  select * into b from public.bands where id = inv.band_id;
  select bm.project_id into mine from public.band_members bm where bm.band_id = b.id and bm.profile_id = me;
  if mine is not null then
    update public.band_invites set status = 'confirmed', to_id = me, answered_at = now() where id = inv.id;
    return mine;
  end if;

  select p.* into theirs from public.projects p join public.band_members bm on bm.project_id = p.id
  where bm.band_id = b.id and bm.profile_id = inv.from_id;

  -- Reuse a project you already added under the same name, if it isn't in another band.
  select p.id into mine from public.projects p
  where p.profile_id = me and lower(p.name) = lower(b.name)
    and not exists (select 1 from public.band_members bm where bm.project_id = p.id)
  limit 1;
  if mine is null then
    insert into public.projects (profile_id, name, role, start_year, end_year)
    values (me, b.name, nullif(left(trim(coalesce(p_role, '')), 80), ''),
            coalesce(theirs.start_year, extract(year from now())::smallint), theirs.end_year)
    returning id into mine;
  end if;

  insert into public.band_members (band_id, profile_id, project_id) values (b.id, me, mine);
  update public.band_invites set status = 'confirmed', to_id = me, answered_at = now() where id = inv.id;
  -- A bandmate tag that brought someone new to Mixstro counts toward the inviter.
  update public.profiles set invited_by = inv.from_id, invite_source = 'tag'
  where id = me and invited_by is null and created_at > now() - interval '7 days';
  return mine;
end $$;

create or replace function public.decline_band_invite(p_token text)
returns void language sql security definer set search_path = public as $$
  update public.band_invites set status = 'declined', answered_at = now()
  where token = p_token and status = 'pending' and to_id = auth.uid();
$$;

-- Who someone played with, per project: the other confirmed members of each band.
-- Signed-out visitors only see members whose music page is public.
create or replace function public.played_with(p_profile uuid)
returns table (project_id bigint, band_id bigint, username citext, first_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select mine.project_id, mine.band_id, p.username, p.first_name, p.avatar_url
  from public.band_members mine
  join public.band_members other on other.band_id = mine.band_id and other.profile_id <> mine.profile_id
  join public.profiles p on p.id = other.profile_id
  where mine.profile_id = p_profile
    and p.onboarded_at is not null
    and (auth.uid() is not null or p.public_page)
    and (auth.uid() is null or not public.is_blocked(auth.uid(), p.id))
  order by other.joined_at;
$$;

revoke all on function public.invite_to_band(bigint, uuid) from public;
revoke all on function public.accept_band_invite(text, text) from public;
revoke all on function public.decline_band_invite(text) from public;
revoke all on function public.band_invite(text) from public;
revoke all on function public.played_with(uuid) from public;
grant execute on function public.invite_to_band(bigint, uuid) to authenticated;
grant execute on function public.accept_band_invite(text, text) to authenticated;
grant execute on function public.decline_band_invite(text) to authenticated;
grant execute on function public.band_invite(text) to anon, authenticated;
grant execute on function public.played_with(uuid) to anon, authenticated;
