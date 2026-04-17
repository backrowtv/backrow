-- Migration: Async job deduplication — idempotency keys for queue workers.
-- W2 launch posture: Vercel Queues delivers at-least-once, so every worker
-- claims its dedup key before doing real work. Rows are TTL'd by a nightly
-- cron (see /api/cron/cleanup-job-dedup). 7d retention is well past the 24h
-- default message TTL, so redeliveries within the retry window always hit.

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_dedup (
  key text PRIMARY KEY,
  job_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_dedup_created_at
  ON public.job_dedup (created_at);

-- Service role only; this table has no user-facing reads.
ALTER TABLE public.job_dedup ENABLE ROW LEVEL SECURITY;
-- No policies → all non-service-role access denied.

COMMENT ON TABLE public.job_dedup IS
  'Consumer-side dedup records for Vercel Queues workers. Rows TTL''d at 7d.';

COMMIT;
