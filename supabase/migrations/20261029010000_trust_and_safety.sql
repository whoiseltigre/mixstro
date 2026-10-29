-- Sprint 1 trust features: activity (#2), recorded clips (#6), notification
-- settings (#9), and blocking, reporting and account deletion (#11).
-- Applies after 20261028000000_init.sql.

-- #2 Active this week ---------------------------------------------------------

-- Called by the app on open. Writes at most once an hour per person.
create or replace function public.touch_last_active()
returns void language sql security invoker as $$
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '1 hour';
$$;

-- Today and search read from this view, so anyone idle for 60+ days drops out
-- until they open the app again. Chats and existing connections are unaffected.
create or replace view public.discoverable_profiles with (security_invoker = true) as
  select * from public.profiles
  where onboarded_at is not null and last_active_at > now() - interval '60 days';

create index if not exists profiles_last_active_idx on public.profiles (last_active_at);

-- #6 Record a clip ------------------------------------------------------------

alter table public.clips drop constraint if exists clips_provider_check;
alter table public.clips add constraint clips_provider_check
  check (provider in ('youtube', 'tiktok', 'instagram', 'soundcloud', 'spotify', 'apple_music', 'upload'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', true, 5242880, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac'])
on conflict (id) do nothing;

-- Files live under clips/<user id>/..., and only the owner can write there.
create policy "upload own clips" on storage.objects for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own clips" on storage.objects for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

-- #9 Notification controls ----------------------------------------------------

-- One row per person. Keys are "<type>.<channel>", e.g. "message.push": false.
-- A missing key means the app default.
create table public.notification_prefs (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "manage own notification prefs" on public.notification_prefs for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- #11 Block, report, delete account -------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy "manage own blocks" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake', 'harassment', 'spam', 'inappropriate', 'other')),
  details text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
-- Write-only for people; reports are reviewed from the dashboard.
create policy "file a report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- True when either person has blocked the other. Security definer so it can
-- see the other person's block, which RLS on blocks would otherwise hide.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Restrictive policies are ANDed with the existing ones, so a block hides the
-- two people from each other everywhere without touching the init policies.
create policy "hide blocked profiles" on public.profiles as restrictive for select to authenticated
  using (not public.is_blocked(auth.uid(), id));
create policy "hide blocked board posts" on public.board_posts as restrictive for select to authenticated
  using (not public.is_blocked(auth.uid(), author_id));
create policy "hide blocked connections" on public.connections as restrictive for select to authenticated
  using (not public.is_blocked(from_id, to_id));
create policy "no connecting when blocked" on public.connections as restrictive for insert to authenticated
  with check (not public.is_blocked(from_id, to_id));
create policy "no messages when blocked" on public.messages as restrictive for insert to authenticated
  with check (not exists (
    select 1 from public.connections c
    where c.id = connection_id and public.is_blocked(c.from_id, c.to_id)
  ));

-- Deletes the signed-in person's account; their profile and everything under it
-- cascades. The app removes their uploaded files through the Storage API first.
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- #10 Light verification ------------------------------------------------------

-- Verified = signed in with (or linked) a Google account. Apple counts too once
-- Sign in with Apple is turned on. Kept on profiles so others can see the check.
alter table public.profiles add column if not exists verified_at timestamptz;

create or replace function public.verified_since(uid uuid)
returns timestamptz language sql stable security definer set search_path = public, auth as $$
  select min(created_at) from auth.identities where user_id = uid and provider in ('google', 'apple');
$$;

-- Recomputed on every profile write, so people can't set it themselves.
create or replace function public.profiles_set_verified()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  new.verified_at := public.verified_since(new.id);
  return new;
end;
$$;
create trigger profiles_set_verified before insert or update on public.profiles
  for each row execute function public.profiles_set_verified();

-- Linking Google later (from Settings) marks an existing profile verified.
create or replace function public.identities_touch_profile()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles set verified_at = public.verified_since(uid) where id = uid;
  return null;
end;
$$;
create trigger identities_touch_profile after insert or delete on auth.identities
  for each row execute function public.identities_touch_profile();

update public.profiles set verified_at = public.verified_since(id);
