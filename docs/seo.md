# SEO

How BackRow makes clubs, festivals, movies, and profiles shareable and indexable.

## Metadata strategy

Every dynamic page exports `generateMetadata`; every static page exports a top-level `metadata: Metadata`. The metadata contract is:

- **Title**: `"<Page> - BackRow"` for marketing pages; `"<Entity> · BackRow"` for dynamic pages (middle dot separator).
- **Description**: ≤160 chars; pulled from the entity's own description/overview/bio when available.
- **Canonical URL**: always absolute, built via `absoluteUrl()` from `src/lib/seo/absolute-url.ts`.
- **Open Graph**: mirrors title + description; `siteName: "BackRow"`; `type` matches the resource (`website` for clubs/discover/marketing, `video.movie` for movies, `profile` for users).
- **Twitter**: `summary_large_image` card whenever we have an OG image (all dynamic pages except profile). `summary` for profile since no custom OG.
- **Robots**: index + follow by default. Exceptions:
  - Clubs with `privacy = 'private'` → `noindex, nofollow`.
  - Movies without a `slug` (unstable URL) → `noindex, follow`.
  - All `/profile/*` pages → `noindex, nofollow` (admin-only page today; decision locked in W4).

### Slug vs UUID: don't interpolate both into one filter

The `/club/[slug]` route accepts either a slug or a UUID. Early versions
tried to match both in one `.or(slug.eq.${x},id.eq.${x})` clause, but
PostgREST casts the RHS of `id.eq` to `uuid` and errors the whole query
when the input is a slug string. Supabase returned `{ data: null, error }`
and the page silently fell through to `notFound()` — which Next.js
serializes with `<meta name="robots" content="noindex">`. Every anon hit
to a public club was being marked uncrawlable, tanking Lighthouse SEO
scores and breaking every shared club link.

Fix (`5d5672b`): branch on UUID shape the same way `resolveClub` does, then
issue a single-column equality query. Single route affected:
`src/app/(dashboard)/club/[slug]/page.tsx`. Apply the same pattern to any
new route that accepts both slug and UUID identifiers.

### No double-fetch pattern

`generateMetadata` and the page body share data via **React `cache()`**, not `unstable_cache`. Helpers live in `src/lib/seo/fetchers.ts`:

```ts
export const getClubForSeo = cache(async (slug: string) => {
  /* ... */
});
export const getFestivalForSeo = cache(async (clubSlug, festivalSlug) => {
  /* ... */
});
export const getMovieForSeo = cache(async (idOrSlug) => {
  /* ... */
});
export const getProfileForSeo = cache(async (userId) => {
  /* ... */
});
```

These use `createPublicClient` (anon key, no cookies) because `generateMetadata` runs outside the user's request context. The page body may still hit `createClient` (cookie-bound) for auth-gated data; those are different client instances and that's fine — the `cache()` wrapper ensures `generateMetadata` itself is called at most once per request even when Next invokes it multiple times for static analysis.

## OG image template

Shared helper: `src/lib/seo/og-template.tsx`. All five OG routes use it:

- `src/app/opengraph-image.tsx` (root)
- `src/app/(dashboard)/club/[slug]/opengraph-image.tsx`
- `src/app/(dashboard)/club/[slug]/festival/[festival-slug]/opengraph-image.tsx`
- `src/app/(dashboard)/movies/[id]/opengraph-image.tsx`
- `src/app/(dashboard)/discover/opengraph-image.tsx`

Spec:

- Size: **1200 × 630**, PNG.
- Background: matte gradient `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)`. No neon, no colored-text-on-colored-bg.
- Accent: optional 6px top strip colored from the entity (club `theme_color`) or BackRow primary (`#6B9B6B`).
- Debossed inner shadow + hairline border for a matte tactile feel.
- BackRow wordmark: **Righteous** font (`--font-brand`), color `#6B9B6B` (primary). The `BrandWordmark` / `BrandLockup` exports enforce this — never inline the wordmark.
- Poster thumbnails: **always `aspect-[2/3]`**. Use `PosterThumb` which derives height from width. Never hard-code a non-2:3 size.
- Font loader is shared in `src/lib/seo/og-fonts.ts`. `renderOg(jsx)` wraps `ImageResponse` and injects Righteous when the fetch succeeds (falls back gracefully).
- Runtime: Fluid Compute (default). **Do not add `runtime = 'edge'`** — Edge is deprecated for functions on Vercel.

## Sitemap

`src/app/sitemap.ts` is dynamic. Inclusion rules:

| Resource     | Inclusion bar                                                                           |
| ------------ | --------------------------------------------------------------------------------------- |
| Public clubs | `privacy != 'private' AND archived = false AND slug IS NOT NULL`                        |
| Festivals    | club is public & non-archived AND `festivals.deleted_at IS NULL` AND `slug IS NOT NULL` |
| Movies       | `slug IS NOT NULL` AND `tmdb_id` appears in `nominations` with `deleted_at IS NULL`     |
| Profiles     | **excluded** (profile routes are `noindex` while admin-gated)                           |

Static marketing entries: `/`, `/discover`, `/blog`, `/faq`, `/create-club`, `/contact`, `/subscriptions`, `/terms-of-use`, `/user-agreement`, `/privacy-policy`.

Queries use `createPublicClient` (anon). The sitemap exports `generateSitemaps` returning `[{ id: 0 }]` at launch; when total URLs exceed ~10k, expand to split files without touching routes.

Lookup order in `lastModified`: `updated_at` → `created_at` → `new Date()`.

## robots.ts

Allow by default. Disallow:

- `/api/`, `/admin`
- Auth flows: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`
- Invite landing: `/join/`
- Private surfaces: `/activity`, `/calendar`, `/timeline`, `/search`
- `/profile` (admin-only; revisit when public profiles ship)

Sitemap URL built via `absoluteUrl("/sitemap.xml")`.

## JSON-LD

`src/components/seo/JsonLd.tsx` provides:

| Export             | Schema.org types                                     | Mount site    |
| ------------------ | ---------------------------------------------------- | ------------- |
| `JsonLd` (default) | `WebApplication` + `Organization` in `@graph`        | root layout   |
| `ClubJsonLd`       | `Organization` + optional `ItemList` of festivals    | club page     |
| `FestivalJsonLd`   | `Event` (VirtualLocation, OnlineEventAttendanceMode) | festival page |
| `MovieJsonLd`      | `Movie` (director + actors capped at 10)             | movie page    |
| `PersonJsonLd`     | `Person` (name, url, image, bio)                     | profile page  |

All are **server-rendered** (no client JS). Output is serialized via `serializeLd()` which escapes `<`, `>`, `&`, and U+2028/2029 to prevent script-tag breakout from user-supplied fields.

## Canonical URL rules

- Always absolute: `https://backrow.tv/...`.
- Use `absoluteUrl(path)` from `src/lib/seo/absolute-url.ts`. Reads `NEXT_PUBLIC_APP_URL` with a hardcoded `https://backrow.tv` fallback.
- No trailing slash (the helper strips one if present).
- Canonical points at the **canonical slug URL**, not the TMDB numeric URL. For movies, prefer `/movies/<slug>` over `/movies/<tmdb_id>` when a slug exists.

## When adding a new dynamic page

1. Export `generateMetadata` that reads from a `React.cache`-wrapped fetcher in `src/lib/seo/fetchers.ts`.
2. Set `alternates.canonical` via `absoluteUrl()`.
3. Add an `opengraph-image.tsx` colocated with the page, using `OgShell` + `BrandLockup` / `BrandWordmark` from `src/lib/seo/og-template.tsx`.
4. Emit server-side JSON-LD when a matching schema.org type applies.
5. Confirm the route is covered by `sitemap.ts` or `robots.ts` disallow — don't leave it in the default-crawl middle.

## Verification checklist

- `bun run build` — no errors; `generateMetadata` appears next to each dynamic route in the route listing.
- `curl /sitemap.xml` returns XML with dynamic entries. `curl -I /sitemap.xml` → `Content-Type: application/xml`.
- `curl /robots.txt` matches expected disallow list.
- Chrome DevTools → `<head>` of a club / festival / movie page: `<title>`, `<meta name="description">`, `<link rel="canonical">`, one JSON-LD `<script>` block.
- Paste a preview URL into Twitter Card Validator, iMessage, Slack — all unfurl with the branded OG.
- Rich Results Test (Google) on a festival URL — `Event` parses without errors.
