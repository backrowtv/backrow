# BackRow Backlog

Lightweight list of follow-ups discovered mid-workstream. Not a roadmap — a
staging area for things we agreed not to do _now_ so the current task stays
focused. Graduate items into real tickets when picked up.

## Follow-ups from W2 (async jobs)

- **Migrate remaining `createNotificationsForUsers` call sites to `enqueueNotificationFanout`.**
  W2 only converted the three fanout paths in scope (announcements, nominations,
  nominations-direct). Other call sites still use the inline fire-and-forget
  path and retain the Fluid Compute teardown-loss risk:
  - `src/app/actions/festivals/updates.ts`, `phases.ts` (3×), `crud.ts`
  - `src/app/actions/clubs/update.ts`, `archive.ts`, `polls.ts`
  - `src/app/actions/seasons/transitions.ts` (2×), `crud.ts` (3×)
  - `src/app/actions/endless-festival/status.ts` (3×), `pool.ts` (2×), `voting.ts` (2×)
  - `src/app/actions/events/crud.ts` (3×)
  - `src/app/actions/feedback.ts`
    Each conversion is mechanical — swap the import, compute a stable dedup key,
    and add the action's row to `docs/security.md`. Bundle into a single PR
    after W2 merges.
- **Blurhash placeholders for optimistic avatar uploads.**
  Today we upload the raw (HEIC → JPEG inline) and let the worker overwrite
  the same storage path. Adding a tiny blurhash to the user row up-front
  would give the UI a nicer intermediate state. Needs a schema field plus
  thumbnail-in-worker step.
- **DLQ surface.** Vercel Queues has no built-in dead-letter topic. Poison
  messages are acknowledged and logged. If ops volume grows, add a simple
  `job_failures` table the worker writes to on `{ acknowledge: true }` so we
  can page on failure rates.
