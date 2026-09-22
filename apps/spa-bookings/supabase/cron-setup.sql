-- =============================================================================
-- Reminder scheduler
-- -----------------------------------------------------------------------------
-- Run this AFTER the app is deployed, once you know its public URL.
-- Vercel's Hobby plan only runs cron once per day, which is useless for a
-- T-60-minute reminder, so the minute-by-minute sweep is driven from Postgres.
--
-- Replace the two placeholders below, then run in the Supabase SQL Editor.
--   <APP_URL>      e.g. https://spa.example.com   (no trailing slash)
--   <CRON_SECRET>  the same value as the CRON_SECRET env var in Vercel
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove a previous schedule if you are re-running this file.
select cron.unschedule('spa-reminder-sweep')
 where exists (select 1 from cron.job where jobname = 'spa-reminder-sweep');

select cron.schedule(
  'spa-reminder-sweep',
  '* * * * *',
  $job$
    select net.http_post(
      url     := '<APP_URL>/api/cron/reminders',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer <CRON_SECRET>'
                 ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 8000
    );
  $job$
);

-- Check it is registered:
--   select jobname, schedule, active from cron.job;
-- Inspect recent runs:
--   select * from cron.job_run_details order by start_time desc limit 20;
