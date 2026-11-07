-- What we've emailed or pushed, so the sender can throttle (one message email per chat
-- per 30 minutes, one role alert a day). Only the server's service role touches it.
create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  ref text not null default '',
  channel text not null check (channel in ('email', 'push')),
  sent_at timestamptz not null default now()
);
create index if not exists notification_log_lookup_idx on public.notification_log (recipient_id, type, ref, sent_at desc);

alter table public.notification_log enable row level security;
-- No policies: people can't read or write it. The service role bypasses RLS.
