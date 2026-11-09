-- Web push: one row per browser or installed app that said yes to notifications.
-- The server (service role) reads these to send; people only manage their own.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- A device that changes hands (sign out, someone else signs in) moves its endpoint to the
-- new person instead of failing the unique check.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
