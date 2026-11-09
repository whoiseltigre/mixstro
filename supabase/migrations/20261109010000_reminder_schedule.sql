-- Runs the reminder job (48h "your turn" nudges, daily role alerts, jam-day reminders)
-- every 15 minutes by calling https://app.mixstro.com/api/cron/reminders.
--
-- Before running this file, store the same CRON_SECRET that's set in Amplify, once:
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- The secret stays in Supabase Vault and never appears in this file.
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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
