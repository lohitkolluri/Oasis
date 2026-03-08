-- Adjudicator: run every 15 minutes instead of hourly.
-- Providers that support webhooks use POST /api/webhooks/disruption for realtime;
-- this cron covers weather/AQI/news that don't support push.

SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname = 'oasis_adjudicator_cron';

SELECT cron.schedule(
  'oasis_adjudicator_cron',
  '*/15 * * * *',
  $$ SELECT call_adjudicator_cron(); $$
);
