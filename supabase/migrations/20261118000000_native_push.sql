-- Push for the iPhone app (APNs). Safe to run more than once.
-- Web push keeps using push_subscriptions; the app's device tokens live here.

create table if not exists public.native_push_tokens (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios' check (platform in ('ios', 'android')),
  -- 'sandbox' for Xcode/TestFlight-debug builds, 'production' for TestFlight and the App Store.
  apns_env text not null default 'production' check (apns_env in ('sandbox', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists native_push_tokens_profile_idx on public.native_push_tokens (profile_id);

alter table public.native_push_tokens enable row level security;

drop policy if exists "own native push tokens" on public.native_push_tokens;
create policy "own native push tokens" on public.native_push_tokens for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- A phone that changes hands moves its token to whoever is signed in now.
create or replace function public.save_native_push_token(p_token text, p_platform text default 'ios', p_env text default 'production')
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.native_push_tokens (profile_id, token, platform, apns_env)
  values (auth.uid(), p_token, p_platform, p_env)
  on conflict (token) do update
    set profile_id = auth.uid(), platform = excluded.platform, apns_env = excluded.apns_env, updated_at = now();
$$;
revoke all on function public.save_native_push_token(text, text, text) from public, anon;
grant execute on function public.save_native_push_token(text, text, text) to authenticated;
