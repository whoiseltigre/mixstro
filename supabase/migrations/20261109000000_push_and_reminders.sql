-- Push notifications and the reminder job, in one file. Safe to run more than once.
-- Nothing to paste: the push keys and the job's secret are generated and kept inside
-- Supabase, readable only by the server (service role).

-- 1) Web push: one row per browser or installed app that said yes to notifications.
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

-- A device that changes hands moves its endpoint to whoever is signed in now.
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

-- 2) Server-only keys (the app creates its push keys here on first use). No policies:
-- only the service role can read or write it.
create table if not exists public.server_keys (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.server_keys enable row level security;
revoke all on public.server_keys from anon, authenticated;

-- 3) The reminder job's secret, generated here, and a check only the server can call.
insert into public.server_keys (name, value)
values ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

create or replace function public.cron_secret_ok(token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.server_keys where name = 'cron_secret' and value = token);
$$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

-- 4) Every 15 minutes, call the app's reminder job (48h "your turn", role alerts, jam reminders).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('mixstro-reminders') where exists (select 1 from cron.job where jobname = 'mixstro-reminders');

select cron.schedule(
  'mixstro-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://app.mixstro.com/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from public.server_keys where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
