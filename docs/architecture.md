# BackRow Architecture Notes

Living reference for the non-obvious parts of the stack. See
`docs/security.md` for the write-path posture, `docs/caching.md` for the
tag-based invalidation strategy, and `docs/database-baseline.md` for schema
history.

## Resilience helpers for external APIs

Every outbound call to a third-party service (TMDB, Resend, RSS feeds) must
survive transient failures without propagating user-facing errors. Two
small primitives in `src/lib/retry.ts` + `AbortSignal.timeout` cover the
cases we care about:

- **`retryWithBackoff(fn, { maxAttempts, backoffMs, shouldRetry })`** —
  default 3 attempts with linear backoff (200ms, 400ms). Pass `shouldRetry`
  to skip retries on 4xx / permanent errors where retrying just wastes
  latency. Introduced in `b99efca`.
- **`AbortSignal.timeout(ms)`** — the TMDB client uses a 3-second per-attempt
  budget (`TMDB_REQUEST_TIMEOUT_MS = 3000` in `src/lib/tmdb/client.ts`) so a
  hung upstream fails fast instead of holding a Fluid Compute instance open.

Current call sites:

| Consumer              | Pattern                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `src/lib/tmdb/client.ts` | `retryWithBackoff` + `AbortSignal.timeout(3000)` on every `fetch`.   |
| `src/lib/email/resend.ts` | `retryWithBackoff` around Resend SDK calls (bulk-email worker + transactional sends). |

### When to wrap a new external call

- **Always** if it's in a user-facing request path — pair `retryWithBackoff`
  with a short `AbortSignal.timeout` so the first attempt doesn't eat the
  whole Fluid Compute budget.
- **Optional** inside a Vercel Queues worker that already gets at-least-once
  retries from the queue — there `retryWithBackoff` is a latency knob
  (recover before the queue's minute-scale backoff), not a reliability
  requirement.
- **Never** inline in a cold Server Component render without a budget —
  prefer moving the call into a `"use cache"` fetcher or a queue producer.

## Background jobs (Vercel Queues)

Bulk fanouts (notification emails, image resize) run in **Vercel Queues**
(`@vercel/queue`, `queue/v2beta` trigger). This moves reliability-sensitive
work off the HTTP request path so server actions return the instant a message
is accepted by the queue.

### Why queues, not inline

- **Reliability.** Fluid Compute may tear down a function as soon as it
  returns. Inline `void sendEmail(...).catch(...)` calls sometimes don't
  complete. Queue workers run as their own invocations with their own
  lifetimes.
- **Scale.** Endless-mode clubs can have 1000+ members. A 1000-recipient
  inline loop will exceed the request budget. The fanout worker chunks into
  bulk-email jobs of 50.
- **Retry.** Vercel retries failed deliveries automatically (at-least-once).
  Inline code gets one shot.

### Topology

```
Producer (server action)                 Vercel Queues            Worker route
                                                                 (handleCallback)
createAnnouncement        ── send('notification-fanout') ──►  /api/jobs/notification-fanout
  ├─ actionRateLimit                                               ├─ claimJob (dedup)
  ├─ getUser + verify email                                        ├─ batch-fetch user prefs
  ├─ INSERT announcement                                           ├─ INSERT notifications rows
  ├─ enqueueNotificationFanout                                     ├─ chunk 50 → send('bulk-email')
  └─ return { success:true }                                       └─ sendPushToUsers

                                         send('bulk-email')  ──►  /api/jobs/bulk-email
                                                                   ├─ claimJob (per recipient)
                                                                   └─ sendEmail (Resend)

updateUserAvatar / updateClubAvatar / updateProfile
  ├─ upload RAW bytes (HEIC → JPEG inline)
  ├─ write URL to row (optimistic)
  ├─ enqueueImageProcessing  ──► /api/jobs/image-processing
  └─ return { success:true, avatarUrl }                             ├─ claimJob
                                                                    ├─ download → sharp resize
                                                                    └─ upsert same storage path
```

### Topics and files

| Topic                 | Producer                    | Handler                                        | Route                                           |
| --------------------- | --------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `notification-fanout` | `enqueueNotificationFanout` | `src/lib/jobs/handlers/notification-fanout.ts` | `src/app/api/jobs/notification-fanout/route.ts` |
| `bulk-email`          | `enqueueBulkEmail`          | `src/lib/jobs/handlers/bulk-email.ts`          | `src/app/api/jobs/bulk-email/route.ts`          |
| `image-processing`    | `enqueueImageProcessing`    | `src/lib/jobs/handlers/image-processing.ts`    | `src/app/api/jobs/image-processing/route.ts`    |
| `account-export`      | `enqueueAccountExport`      | `src/lib/jobs/handlers/account-export.ts`      | `src/app/api/jobs/account-export/route.ts`      |
| `account-hard-delete` | `enqueueAccountHardDelete`  | `src/lib/jobs/handlers/account-hard-delete.ts` | `src/app/api/jobs/account-hard-delete/route.ts` |

All producers live in `src/lib/jobs/producers.ts`. Shared payload types live
in `src/lib/jobs/types.ts`.

### Authentication model

Queue workers are **not** bearer-authed like our cron routes. Vercel binds
each topic to its route via `experimentalTriggers` in `vercel.json`; the
route is not internet-addressable under that trigger. So the usual rule
applies to the **producer** (server action), not the worker:

- Producer runs `actionRateLimit` → auth → `requireVerifiedEmail` before
  `enqueue*()`.
- Worker runs as system: no user identity, service-role Supabase client.

This is a deviation from the `CRON_SECRET` bearer pattern we use for cron
routes. See the `@vercel/queue` docs at https://vercel.com/docs/queues.

### Idempotency

At-least-once delivery means every handler can fire 2–3 times for the same
payload. Two layers:

1. **Producer-side** (`idempotencyKey` on `send()`). Vercel filters duplicate
   publishes within the message TTL.
2. **Consumer-side** (`claimJob(key, jobType)` from `src/lib/jobs/dedup.ts`).
   Redis `SET NX EX 604800` plus a Postgres `job_dedup` row keyed on a
   SHA-256. Redis wins the hot path; Postgres is the source of truth and
   survives cache eviction.

Dedup keys are stable across retries — computed from domain ids
(`announcement.id`, `storagePath`, `(festivalId, tmdbId, userId)`) — not
from the queue's `messageId`. That lets retries of the same message AND
replays from a different producer call (e.g. an API retry) both dedupe.

Rows in `job_dedup` are TTL'd to 7 days by `/api/cron/cleanup-job-dedup`
(nightly). That retention is well past the default 24h message TTL, so
retries always hit the dedup record.

### Retry policy

Each worker's `handleCallback(handler, { retry })` callback decides:

- `image-processing`: acknowledge after 5 deliveries; exponential backoff
  capped at 5 min.
- `bulk-email`: acknowledge after 8 deliveries; same backoff.
- `notification-fanout`: default (Vercel's 32-attempt backoff). Failures
  here usually mean the DB is down, which recovers on its own.

Poison messages are logged to stderr before acknowledgement so Vercel's
runtime logs surface them.

### Local development

Per `@vercel/queue` docs, `send()` and `handleCallback()` both work locally
when OIDC tokens are present (`vercel env pull` populates them). Messages
are published to the real queue service; consumer routes fire in-process.

Without OIDC tokens, `src/lib/jobs/enqueue.ts` falls through to
`src/lib/jobs/inline-runner.ts` which invokes the handler directly — enough
to keep the dev loop working. In production (`VERCEL=1`) the inline path is
an error.

### Adding a new job type

1. Add the topic to `JOB_TOPICS` in `src/lib/jobs/types.ts` with its payload
   interface.
2. Write the handler at `src/lib/jobs/handlers/<topic>.ts`. Always call
   `claimJob()` before doing work.
3. Add a producer to `src/lib/jobs/producers.ts`. Choose a stable dedup key.
4. Register the route at `src/app/api/jobs/<topic>/route.ts` using
   `handleCallback` with an appropriate retry callback.
5. Bind the topic in `vercel.json` under `functions[<route>].experimentalTriggers`.
6. Add a switch arm in `src/lib/jobs/inline-runner.ts` for the dev fallback.
7. Update the topic table in this document and (if the producer is a new
   server action) `docs/security.md`.

## Upstream resilience

External APIs occasionally drop connections, time out, or return 5xx blips.
`retryWithBackoff()` (`src/lib/retry.ts`) wraps two integration points:

- `src/lib/tmdb/client.ts:33` — every TMDB fetch (also gated by 3-second
  `AbortSignal.timeout`)
- `src/lib/email/resend.ts:33` — every `sendEmail` call (transactional +
  queued bulk)

Signature: `retryWithBackoff(fn, options?: { maxAttempts?: number; backoffMs?: number; shouldRetry?: (err) => boolean })`.
Defaults: `maxAttempts = 3`, `backoffMs = 200` (linear: 200ms before retry 2,
400ms before retry 3). Pass `shouldRetry: (err) => …` to skip retries on
non-transient errors (4xx).
