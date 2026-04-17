# Security Posture

This document is the authoritative map of BackRow's write-path abuse-prevention coverage. Every new user-facing write server action must be added to the table below (and to the relevant action file) before merging.

## Primitives

| Primitive                                   | Location                                     | Purpose                                                                                           |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `actionRateLimit(name, opts)`               | `src/lib/security/action-rate-limit.ts`      | Per-IP sliding window (Upstash Redis; in-memory fallback in dev).                                 |
| `actionRateLimitByUser(name, userId, opts)` | `src/lib/security/action-rate-limit.ts`      | Per-user sliding window. Use for caps that should follow the user across networks.                |
| `requireHuman()`                            | `src/lib/security/botid.ts`                  | Wraps `checkBotId()` from `botid/server`. Auto-bypasses locally when `NODE_ENV !== "production"`. |
| `requireVerifiedEmail(user)`                | `src/lib/security/require-verified-email.ts` | Returns `{ ok: false, error }` when `user.email_confirmed_at == null`.                            |

All primitives return `{ ok, error }` / `{ success, error }` — they never throw. Call sites bubble the error into the existing server-action return shape.

## Call sequence

Standard order for a write-path action, after `'use server'`:

```ts
// 1. Rate limit first (cheapest rejection).
const rateCheck = await actionRateLimit("name", { limit, windowMs });
if (!rateCheck.success) return { error: rateCheck.error };

// 2. Bot check (only on high-value actions).
const human = await requireHuman();
if (!human.ok) return { error: human.error };

// 3. Auth.
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return { error: "..." };

// 4. Email gate.
const verified = requireVerifiedEmail(user);
if (!verified.ok) return { error: verified.error };

// 5. Business logic.
```

## Coverage

| Server action                   | Rate limit (IP) | Rate limit (user) | BotID | Email gate                         |
| ------------------------------- | --------------- | ----------------- | ----- | ---------------------------------- |
| `signUp`                        | 5/min           | —                 | ✅    | N/A (signup _creates_ the account) |
| `signIn`                        | 5/min           | —                 | —     | N/A                                |
| `magicLink`                     | 5/min           | —                 | —     | N/A                                |
| `createClub`                    | 3/min           | —                 | ✅    | ✅                                 |
| `createInviteToken`             | 10/min          | 50/day            | ✅    | ✅                                 |
| `sendInviteEmails`              | 5/min           | —                 | —     | ✅                                 |
| `addFeedbackItem`               | 5/min           | —                 | ✅    | ✅                                 |
| `voteOnFeedback`                | 30/min          | —                 | —     | ✅                                 |
| `deleteFeedbackItem`            | 10/min          | —                 | —     | ✅                                 |
| `createComment`                 | 10/min          | —                 | —     | ✅                                 |
| `updateComment`                 | —               | —                 | —     | ✅                                 |
| `deleteComment`                 | —               | —                 | —     | ✅                                 |
| `toggleVote` (discussions)      | 30/min          | —                 | —     | ✅                                 |
| `unlockThread`                  | 20/min          | —                 | —     | ✅                                 |
| `revealThreadSpoilers`          | 20/min          | —                 | —     | ✅                                 |
| `voteForTheme`                  | 20/min          | —                 | —     | ✅                                 |
| `voteOnThemePool`               | 30/min          | —                 | —     | ✅                                 |
| `togglePoolMovieVote` (endless) | 30/min          | —                 | —     | ✅                                 |
| `createJoinRequest`             | 5/min           | —                 | —     | ✅                                 |
| `approveJoinRequest`            | —               | —                 | —     | ✅ (+ member-cap check)            |
| `createAnnouncement`            | 10/min          | —                 | —     | ✅                                 |
| `createRichAnnouncement`        | 10/min          | —                 | —     | ✅                                 |
| `createNomination`              | 10/min          | —                 | —     | ✅                                 |
| `createNominationDirect`        | 10/min          | —                 | —     | ✅                                 |
| `updateUserAvatar`              | 10/min          | —                 | —     | ✅                                 |
| `updateClubAvatar`              | 10/min          | —                 | —     | ✅                                 |
| `POST /api/account/export`      | 3/hr            | —                 | ✅    | ✅                                 |
| `POST /api/account/delete`      | 3/min           | —                 | ✅    | ✅                                 |

**Queue workers** (`src/app/api/jobs/*/route.ts`) run as system via Vercel Queues' `experimentalTriggers` and bypass the user-scoped gates above — the upstream producer action enforces them. Workers are not user-callable: they're bound to a topic in `vercel.json`, not exposed as a public HTTP endpoint.

## Member-count ceiling

Every club has `clubs.max_members` — default **1000** for standard-mode clubs, **100000** for endless-mode (festival_mode stored in `clubs.settings->>'festival_mode'`). Enforced in two places:

1. **Action layer** (`approveJoinRequest`): `SELECT count(*) FROM club_members WHERE club_id = $1` compared against `clubs.max_members`. Returns a friendly error.
2. **Restrictive RLS policy** on `club_members` (migration `0002_abuse_prevention.sql`): denies any INSERT that would push the row count at or beyond `max_members`. Applies even to service-role clients.

## Adding a new write action

1. Write the action.
2. Add the call-sequence block (rate limit → BotID if high-value → auth → email gate).
3. Add a row to the Coverage table above.
4. If the action creates a user-visible resource that could be abused at scale, add a path to `instrumentation-client.ts`'s `protect` list so BotID collects client signals.

## Operational checks

- **Upstash dashboard:** keys should land under prefixes `br:rl:api:*` (API routes) and `br:rl:act:*` (server actions).
- **BotID:** enable Deep Analysis in Vercel dashboard → Firewall. In local dev, `checkBotId()` auto-bypasses.
- **Env vars:** `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Vercel Marketplace Upstash; `UPSTASH_REDIS_REST_*` also accepted as a fallback). BotID has no env vars — it's configured via the Vercel dashboard.
