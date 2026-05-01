# Security Posture

This document is the authoritative map of BackRow's write-path abuse-prevention coverage. Every new user-facing write server action must be added to the table below (and to the relevant action file) before merging.

## Primitives

| Primitive                                   | Location                                     | Purpose                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actionRateLimit(name, opts)`               | `src/lib/security/action-rate-limit.ts`      | Per-IP sliding window (Upstash Redis; in-memory fallback in dev).                                                                                                       |
| `actionRateLimitByUser(name, userId, opts)` | `src/lib/security/action-rate-limit.ts`      | Per-user sliding window. Use for caps that should follow the user across networks.                                                                                      |
| `requireVerifiedEmail(user)`                | `src/lib/security/require-verified-email.ts` | Returns `{ ok: false, error }` when `user.email_confirmed_at == null`.                                                                                                  |
| `escapeLike(input)`                         | `src/lib/security/postgrest-escape.ts`       | Backslash-escapes PostgREST-structural chars (`\`, `%`, `_`, `,`, `.`, `(`, `)`, `*`) in user-supplied strings destined for `.ilike()` patterns or `.or()` DSL strings. |

> Vercel BotID / `requireHuman()` was removed — it classified real iOS Safari sessions as bots and blocked legitimate users. Don't re-add a third-party bot-detection layer without first validating the client runtime end-to-end across iOS Safari, Chrome, Firefox, and the PWA.

All primitives return `{ ok, error }` / `{ success, error }` — they never throw. Call sites bubble the error into the existing server-action return shape.

`escapeLike` is the exception — it's a pure string transform, not a gate. Wrap **every** user-controlled string before interpolating it into a `.or()` or `.ilike()` clause, even when RLS is in place: classic SQL injection isn't reachable through PostgREST's parameterized filter values, but wildcard expansion (`%` / `_` matching every row) and OR-clause grafting (`foo,col.eq.x`) both are. Current call sites: admin / discover / search routes, the club / festival / movie / user repositories, and the TMDB-sourced director/composer search (9 sites, from `f062dfc`). Unit coverage: `src/__tests__/lib/security/postgrest-escape.test.ts`.

## Call sequence

Standard order for a write-path action, after `'use server'`:

```ts
// 1. Rate limit first (cheapest rejection).
const rateCheck = await actionRateLimit("name", { limit, windowMs });
if (!rateCheck.success) return { error: rateCheck.error };

// 2. Auth.
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return { error: "..." };

// 3. Email gate.
const verified = requireVerifiedEmail(user);
if (!verified.ok) return { error: verified.error };

// 4. Business logic.
```

## Coverage

| Server action                     | Rate limit (IP) | Rate limit (user) | Email gate                          |
| --------------------------------- | --------------- | ----------------- | ----------------------------------- |
| `signUp`                          | 5/min           | —                 | N/A (signup _creates_ the account)  |
| `signIn`                          | 5/min           | —                 | N/A                                 |
| `signInWithOAuth`                 | 5/min           | —                 | N/A (OAuth-side; provider verifies) |
| `magicLink`                       | 5/min           | —                 | N/A                                 |
| `createClub`                      | 3/min           | —                 | ✅                                  |
| `createInviteToken`               | 10/min          | 50/day            | ✅                                  |
| `sendInviteEmails`                | 5/min           | —                 | ✅                                  |
| `addFeedbackItem`                 | 5/min           | —                 | ✅                                  |
| `voteOnFeedback`                  | 30/min          | —                 | ✅                                  |
| `deleteFeedbackItem`              | 10/min          | —                 | ✅                                  |
| `createComment`                   | 10/min          | —                 | ✅                                  |
| `updateComment`                   | 20/min          | —                 | ✅                                  |
| `deleteComment`                   | 20/min          | —                 | ✅                                  |
| `toggleVote` (discussions)        | 30/min          | —                 | ✅                                  |
| `unlockThread`                    | 20/min          | —                 | ✅                                  |
| `revealThreadSpoilers`            | 20/min          | —                 | ✅                                  |
| `voteForTheme`                    | 20/min          | —                 | ✅                                  |
| `voteOnThemePool`                 | 30/min          | —                 | ✅                                  |
| `togglePoolMovieVote` (endless)   | 30/min          | —                 | ✅                                  |
| `createJoinRequest`               | 5/min           | —                 | ✅                                  |
| `approveJoinRequest`              | —               | —                 | ✅ (+ member-cap check)             |
| `createAnnouncement`              | 10/min          | —                 | ✅                                  |
| `createRichAnnouncement`          | 10/min          | —                 | ✅                                  |
| `createNomination`                | 10/min          | —                 | ✅                                  |
| `createNominationDirect`          | 10/min          | —                 | ✅                                  |
| `updateUserAvatar`                | 10/min          | —                 | ✅                                  |
| `updateClubAvatar`                | 10/min          | —                 | ✅                                  |
| `POST /api/account/export`        | 3/hr            | —                 | ✅                                  |
| `POST /api/account/delete`        | 3/min           | —                 | ✅                                  |
| `joinPublicClub`                  | 10/min          | —                 | ✅                                  |
| `toggleFavoriteClub`              | 30/min          | —                 | ✅                                  |
| `updateMemberPreference`          | 30/min          | —                 | ✅                                  |
| `createPoll`                      | 5/min           | —                 | ✅                                  |
| `voteOnPoll`                      | 30/min          | —                 | ✅                                  |
| `closePoll`                       | 10/min          | —                 | ✅                                  |
| `updatePoll`                      | 10/min          | —                 | ✅                                  |
| `deletePoll`                      | 10/min          | —                 | ✅                                  |
| `updateClubSettings`              | 10/min          | —                 | ✅                                  |
| `updateClubMemberPersonalization` | 10/min          | —                 | ✅                                  |
| `rsvpToEvent`                     | 30/min          | —                 | ✅                                  |
| `removeRsvp`                      | 30/min          | —                 | ✅                                  |
| `blockUser`                       | 30/min          | —                 | ✅                                  |
| `unblockUser`                     | 30/min          | —                 | ✅                                  |
| `reportUser`                      | 10/min          | —                 | ✅                                  |
| `addTheme`                        | 20/min          | —                 | ✅                                  |
| `removeTheme`                     | 20/min          | —                 | ✅                                  |
| `updateTheme`                     | 20/min          | —                 | ✅                                  |
| `updateNavPreferences`            | 30/min          | —                 | ✅                                  |
| `resetNavPreferences`             | 10/min          | —                 | ✅                                  |
| `updateSidebarPreferences`        | 30/min          | —                 | ✅                                  |
| `resetSidebarPreferences`         | 10/min          | —                 | ✅                                  |
| `updateMovieLinkPreferences`      | 30/min          | —                 | ✅                                  |
| `resetMovieLinkPreferences`       | 10/min          | —                 | ✅                                  |
| `createThread`                    | 5/min           | —                 | ✅                                  |
| `updateThread`                    | 20/min          | —                 | ✅                                  |
| `deleteThread`                    | 20/min          | —                 | ✅                                  |
| `addTagToThread`                  | 30/min          | —                 | ✅                                  |
| `removeTagFromThread`             | 30/min          | —                 | ✅                                  |
| `createRating`                    | 20/min          | —                 | ✅                                  |
| `updateGenericRating`             | 20/min          | —                 | ✅                                  |
| `deleteGenericRating`             | 20/min          | —                 | ✅                                  |
| `deleteEndlessRating`             | 20/min          | —                 | ✅                                  |
| `markMovieWatched`                | 30/min          | —                 | ✅                                  |
| `unmarkMovieWatched`              | 30/min          | —                 | ✅                                  |
| `updateWatchCount`                | 30/min          | —                 | ✅                                  |
| `submitContactForm`               | 3/min + 20/hr   | —                 | N/A (public)                        |

**Queue workers** (`src/app/api/jobs/*/route.ts`) run as system via Vercel Queues' `experimentalTriggers` and bypass the user-scoped gates above — the upstream producer action enforces them. Workers are not user-callable: they're bound to a topic in `vercel.json`, not exposed as a public HTTP endpoint.

## Member-count ceiling

Every club has `clubs.max_members` — default **1000** for standard-mode clubs, **100000** for endless-mode (festival_mode stored in `clubs.settings->>'festival_mode'`). Enforced in two places:

1. **Action layer** (`approveJoinRequest`): `SELECT count(*) FROM club_members WHERE club_id = $1` compared against `clubs.max_members`. Returns a friendly error.
2. **Restrictive RLS policy** on `club_members` (migration `0002_abuse_prevention.sql`): denies any INSERT that would push the row count at or beyond `max_members`. Applies even to service-role clients.

## PostgREST input escaping

PostgREST safely parameterizes filter values, but two abuse vectors survive:

1. **Wildcard expansion.** `%` and `_` are LIKE wildcards. A user typing `%` matches every row.
2. **Clause injection in `.or()`.** The `.or()` argument is a comma-separated DSL string. A user typing `foo,role.eq.admin` inside an interpolated `.or()` grafts an extra clause; RLS still applies but the intended filter is no longer the only filter.

`escapeLike()` (`src/lib/security/postgrest-escape.ts`) backslash-escapes `\`, `%`, `_`, `,`, `.`, `(`, `)`, `*`. Wrap every user-controlled string that reaches `.or()` or an interpolated `.ilike()` pattern.

| Layer        | Files                                                    |
| ------------ | -------------------------------------------------------- |
| Repositories | `src/lib/repositories/{movies,festivals,clubs,users}.ts` |
| Actions      | `src/app/actions/search.ts`, `src/app/actions/admin.ts`  |
| Pages        | `src/app/(dashboard)/discover/page.tsx`                  |
| API routes   | `src/app/api/clubs/[clubId]/festivals/route.ts`          |

## Adding a new write action

1. Write the action.
2. Add the call-sequence block (rate limit → auth → email gate).
3. Add a row to the Coverage table above.

## Operational checks

- **Upstash dashboard:** keys should land under prefixes `br:rl:api:*` (API routes) and `br:rl:act:*` (server actions).
- **Env vars:** `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Vercel Marketplace Upstash; `UPSTASH_REDIS_REST_*` also accepted as a fallback).
