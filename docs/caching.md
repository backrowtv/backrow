# Caching strategy

BackRow runs on Next.js 16 with `cacheComponents: true` (the successor to PPR).
Each Server Component renders independently and can be cached, dynamic, or
static. This doc is the single source of truth for how we cache and invalidate.

> **Flag history.** `cacheComponents` was briefly disabled in `cbd5f3f` to
> unblock a prod deploy when several pages were reading dynamic data at the
> top level (auth, `searchParams`, `headers()`), which forced the whole subtree
> dynamic and broke prerendering. `8c91651` re-enabled it by wrapping each
> dynamic body in `<Suspense>` so the outer shell stays static-prerenderable
> (Partial Prerender). Two layouts (`src/app/layout.tsx`,
> `src/app/(marketing)/layout.tsx`) were made sync — their dynamic reads
> (`headers()` for GPC, `supabase.auth.getUser()` for dark-mode gating) now
> live inside Suspense boundaries via small async children. Follow the same
> pattern when adding a new route that needs auth/cookies at top level.

---

## Two cache layers — don't confuse them

| Layer              | Where                        | Scope         | Purpose                                    |
| ------------------ | ---------------------------- | ------------- | ------------------------------------------ |
| `React.cache(fn)`  | `src/lib/seo/fetchers.ts`    | One request   | Dedupe identical fetches inside one render |
| Next `"use cache"` | Server action/component body | Cross-request | Share computed data across renders         |

**W5 is about the `"use cache"` layer.** Do **not** touch `src/lib/seo/fetchers.ts`
— that's per-request React.cache, a different layer.

---

## Tag naming — colon scheme

All cache tags use `entity:id` or `entity:index` form. Every tag string is
declared via `CacheTags.*` in `src/lib/cache/invalidate.ts`, never hand-written.

| Scope               | Helper                              | Example                     |
| ------------------- | ----------------------------------- | --------------------------- |
| One club            | `CacheTags.club(id)`                | `club:a4b2…`                |
| One festival        | `CacheTags.festival(id)`            | `festival:f1…`              |
| One season          | `CacheTags.season(id)`              | `season:s1…`                |
| One discussion      | `CacheTags.discussion(id)`          | `discussion:t1…`            |
| One poll            | `CacheTags.poll(id)`                | `poll:p1…`                  |
| One user (member)   | `CacheTags.member(userId)`          | `member:u1…`                |
| One movie (TMDB id) | `CacheTags.movie(tmdbId)`           | `movie:603`                 |
| Club list index     | `CacheTags.clubsIndex()`            | `clubs:index`               |
| Discover index      | `CacheTags.discoverIndex()`         | `discover:index`            |
| Featured club slot  | `CacheTags.featuredClub()`          | `featured:club`             |
| Marketing slots     | `CacheTags.upcomingMovies()` / `…`  | `movies:upcoming`           |
| Stats (per-kind)    | `CacheTags.clubStats(clubId, kind)` | `stats:participation:a4b2…` |

### Tag safety — IDs only

Tags show up in observability + logs. **Never put email, display name, or any
RLS-protected string in a tag.** IDs are the only acceptable content. The
invalidation test suite asserts tags contain no `@` and no uppercase letters.

---

## Writing `"use cache"` functions

Every cached function **must** declare both `cacheLife(...)` and `cacheTag(...)`.
A `"use cache"` without a tag is a leak — there's no way to invalidate it.

```ts
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/invalidate";

export async function getClubMembers(clubId: string) {
  "use cache";
  cacheLife("hours");           // bucket: 'minutes' | 'hours' | 'days' | 'max'
  cacheTag(CacheTags.club(clubId));

  const supabase = await createClient();
  return supabase.from("club_members")…;
}
```

### When to tag with the resolved id vs the input

When the input is a slug but the cache scope is by id, call `cacheTag()`
**after** the fetch with the resolved id:

```ts
export async function getClubBySlug(slug: string) {
  "use cache";
  cacheLife("hours");

  const club = await fetchClubBySlug(slug);
  if (club?.id) cacheTag(CacheTags.club(club.id)); // <- resolved id
  cacheTag(CacheTags.clubsIndex());
  return club;
}
```

Without this, writes that bust `club:<id>` don't reach a slug-keyed entry.

### Runtime-data constraint

`"use cache"` cannot access `cookies()`, `headers()`, or `searchParams`.
Anything user-specific stays outside the cached function; pass primitives in
as arguments.

```ts
// ✗ wrong — auth.getUser reads cookies
export async function getPollResults(pollId: string) {
  "use cache";
  const { user } = await supabase.auth.getUser(); // breaks the cache
}

// ✓ right — split the auth check from the cached read
export async function getPollResults(pollId: string) {
  return getPublicPollResults(pollId); // cached
}
async function getPublicPollResults(pollId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.poll(pollId));
  return aggregateVotes(pollId); // no cookies here
}
```

Auth-gated cacheable queries (thread list, poll results with user vote state)
still need this split. That's a planned expansion — not every hot read is
cached today.

### Catalog of `"use cache"` server actions

Restored in `8c91651` after the temporary disable. All six files declare
both `cacheLife(...)` and `cacheTag(...)` on every cached function. Before
adding another hot read, check this catalog first — the scope you want may
already be covered.

| File                                     | Cached function(s)                                                                                                                                                                         | Tag helpers used                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/app/actions/marketing.ts`           | `getUpcomingMoviesData`, `getFilmNewsData`, `getCurrentCuratedPick`, `getFeaturedClub`, `getPopularMovies` (5)                                                                              | `CacheTags.upcomingMovies()`, `CacheTags.filmNews()`, `CacheTags.featuredClub()`, etc. |
| `src/app/actions/clubs/queries.ts`       | `getClubBySlug`, `getClubMembers`, `getClubById` (3)                                                                                                                                       | `CacheTags.club(id)`, `CacheTags.clubsIndex()`                               |
| `src/app/actions/festivals/crud.ts`      | `getFestivalBySlug`, `getFestivalsByClub` (2)                                                                                                                                              | `CacheTags.festival(id)`, `CacheTags.club(clubId)`                           |
| `src/app/actions/stats.ts`               | `getFestivalParticipationData`, `getRatingDistributionData`, `getTopRatedMoviesData`, `getMemberActivityData`, `getFestivalCompletionData`, `getRatingTrendsData` (6)                      | `CacheTags.clubStats(clubId, kind)`, `CacheTags.club(clubId)`                |
| `src/app/actions/movies.ts`              | `getCachedMovieData` (internal), `getMovieBySlug` (2)                                                                                                                                      | `CacheTags.movie(tmdbId)`                                                    |
| `src/app/actions/auth/profile.ts`        | `getUserProfile` (1)                                                                                                                                                                       | `CacheTags.member(userId)`                                                    |

Total: **19** `"use cache"` entry points across 6 files.

---

## Invalidating after writes

Never call `revalidateTag` directly from a server action. Use the typed
helpers in `src/lib/cache/invalidate.ts` so cascades stay consistent:

| Write                        | Helper                                             |
| ---------------------------- | -------------------------------------------------- |
| Club metadata / settings     | `invalidateClub(clubId)`                           |
| Festival lifecycle / phase   | `await invalidateFestival(festivalId, { clubId })` |
| Discussion thread / comments | `invalidateDiscussion(threadId, clubId)`           |
| Poll vote / close / edit     | `invalidatePoll(pollId, clubId)`                   |
| Join / leave / role change   | `invalidateMember(clubId, userId)`                 |
| Season rollover / conclude   | `invalidateSeason(seasonId, clubId)`               |
| Stats (recompute per-kind)   | `invalidateClubStats(clubId, kind?)`               |
| Movie metadata               | `invalidateMovie(tmdbId)`                          |
| Admin featured-club / news … | `invalidateMarketing(slot)`                        |

Each helper cascades the parents automatically. `invalidateFestival` looks up
`club_id` / `season_id` when not passed — pass them when you already have them
to avoid the extra query.

### When `revalidatePath` is still allowed

Path-based invalidation stays for **genuinely broad** writes — the home page,
`/admin`, `/profile`, `/discover` — where the whole page shell is stale and
there's no narrower scope. Scoped writes (anything tied to a specific club,
festival, discussion, user) must go through the tag helpers.

Examples kept as path-based: `curated-collections.ts`, admin site
announcements, display-preferences, auth flows, profile CRUD.

---

## Realtime subscriptions

Every Supabase realtime subscription on a user-owned table **must** include
a server-side filter. The subscription DSL is enforced by Postgres logical
replication — an unfiltered subscription fans every row change to every
connected client.

```ts
supabase
  .channel(`notifications:${userId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`, // <- REQUIRED
    },
    handler
  )
  .subscribe();
```

The NotificationBell regression test (`notification-bell-scope.test.ts`)
asserts this filter is in place so the privacy invariant survives future
refactors.

---

## Before / after

```ts
// ❌ Before — path-based invalidation, blasts whole subtree
const { data: club } = await supabase.from("clubs").select("slug")…
revalidatePath(`/club/${club.slug}`);
revalidatePath(`/club/${club.slug}/discuss`);
revalidatePath(`/club/${club.slug}/history`);
```

```ts
// ✅ After — tag-based, hits only what changed
invalidateClub(clubId);
// or for a write that touches a specific festival:
await invalidateFestival(festivalId, { clubId, seasonId });
```

Under `cacheComponents: true`, the tag-based version lets the page shell,
navigation, and untouched sibling components render from cache. The
path-based version re-executes everything under `/club/<slug>`.

---

## Verification

- `bun run test -- src/__tests__/cache` — unit tests for all invalidation
  helpers + NotificationBell regression. 21 tests.
- `bun run build` — build logs each route's cache policy. Tagged routes show
  `(cached)` / `(dynamic)`.
- Vercel observability (post-deploy) — `revalidateTag` count ↑ and
  `revalidatePath` count ↓ are the headline numbers.

---

## Future work (not in W5)

- **Split auth-gated reads** — `getThreadsByClub`, `getPollsWithVotes`, etc.
  currently require `supabase.auth.getUser()` which excludes them from
  `"use cache"`. Refactor to `cachedPublicFetch() + authCheckedWrap()` pattern.
- **Runtime Cache API (`@vercel/functions`)** — per-region KV cache for hot
  API responses. Not needed at launch scale; revisit when a single
  deployment region starts bottlenecking.
