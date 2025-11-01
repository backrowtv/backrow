-- Migration: Enable pg_cron for scheduled maintenance jobs
-- Applied: 2025-06-03

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role (required for scheduling)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule job: Archive old read notifications (daily at 3 AM UTC)
-- Archives notifications that are read and older than 30 days
SELECT cron.schedule(
  'archive-old-notifications',
  '0 3 * * *',  -- Every day at 3 AM UTC
  $$SELECT public.archive_old_notifications()$$
);

-- Schedule job: Delete old archived notifications (weekly on Sunday at 4 AM UTC)
-- Deletes notifications archived more than 90 days ago
SELECT cron.schedule(
  'delete-archived-notifications',
  '0 4 * * 0',  -- Every Sunday at 4 AM UTC
  $$SELECT public.delete_old_archived_notifications()$$
);

-- Schedule job: Clean up old analytics data (monthly on 1st at 5 AM UTC)
-- Keep last 90 days of analytics to prevent unbounded table growth
SELECT cron.schedule(
  'cleanup-old-analytics',
  '0 5 1 * *',  -- First day of each month at 5 AM UTC
  $$
  DELETE FROM public.search_analytics WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM public.filter_analytics WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- To view scheduled jobs: SELECT * FROM cron.job;
-- To view job run history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- To unschedule a job: SELECT cron.unschedule('job-name');

