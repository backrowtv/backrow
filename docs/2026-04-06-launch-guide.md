# BackRow Launch Guide

**Date:** April 6, 2026

---

## Table of Contents

1. [Launch Process (Order of Operations)](#1-launch-process)
2. [Supabase Production Setup](#2-supabase-production-setup)
3. [Vercel Production Setup](#3-vercel-production-setup)
4. [TMDB API](#4-tmdb-api)
5. [Error Monitoring (Sentry)](#5-error-monitoring-sentry)
6. [Uptime & Monitoring Stack](#6-uptime--monitoring-stack)
7. [Cost Summary](#7-cost-summary)
8. [Production Checklists](#8-production-checklists)

---

## 1. Launch Process

### Step-by-Step Order

**Phase 1 — Accounts & Infrastructure**

1. Create a new Supabase organization under your backrow.tv email
2. Create a production Supabase project on the Pro plan ($25/mo)
3. Pick a region that matches where you'll deploy on Vercel (e.g., US East `iad1` — make sure both match to avoid 60ms+ latency on every DB query)
4. Run all migrations against the production database (`supabase db push` or `supabase migration up`)
5. Verify all tables have RLS policies enabled

**Phase 2 — Auth Configuration**

6. In the production Supabase project, configure auth:
   - Set Site URL to `https://backrow.tv`
   - Add redirect URLs: `https://backrow.tv/**` and `https://*.vercel.app/**` (for preview deploys)
   - Do NOT add `localhost` to production redirect URLs
7. Set up OAuth providers (Google, etc.) with production redirect URIs pointing to `backrow.tv`
8. Customize email templates — replace all "Supabase" branding with "BackRow"
9. Enable email confirmation (likely disabled in your dev project)
10. Disable any auth providers you don't use

**Phase 3 — Vercel Deployment**

11. Link your GitHub repo to a Vercel project (if not already)
12. Set all environment variables in Vercel for production:
    - `NEXT_PUBLIC_SUPABASE_URL` → production Supabase URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → production anon key
    - `SUPABASE_SERVICE_ROLE_KEY` → production service role key (mark as **Sensitive**)
    - `TMDB_API_KEY` → your TMDB key
    - `CRON_SECRET` → generate a new random secret
    - `NEXT_PUBLIC_APP_URL` → `https://backrow.tv`
    - `NEXT_PUBLIC_ENABLE_TEST_AUTH` → do NOT set this in production
13. Point `backrow.tv` DNS to Vercel (CNAME or Vercel nameservers)
14. Vercel handles SSL automatically
15. Set up `www.backrow.tv` → `backrow.tv` redirect (or vice versa)
16. Deploy — push to main

**Phase 4 — Monitoring**

17. Set up UptimeRobot (free) — monitor `https://backrow.tv` and `/api/health`
18. Set up Sentry (free tier) — error tracking for both client and server
19. Enable Vercel Analytics + Speed Insights (both free at your scale)

**Phase 5 — Verification**

20. Test every auth flow on the production URL (sign up, sign in, OAuth, password reset, magic link)
21. Test creating a club, inviting a member, running through festival phases
22. Check cron jobs are firing (Vercel only runs crons on production deployments)
23. Verify TMDB data loads correctly
24. Check console for errors via browser DevTools

**Phase 6 — Go Live**

25. Invite your first real users
26. Monitor Sentry and Vercel logs closely for the first 48 hours

---

## 2. Supabase Production Setup

### Why Pro Plan ($25/mo)

The free tier **pauses your database after 7 days of inactivity** and has severe connection limits. Pro is non-negotiable for production.

| Resource             | Free Tier           | Pro Plan               |
| -------------------- | ------------------- | ---------------------- |
| Database             | 500 MB              | 8 GB included          |
| Bandwidth            | 5 GB                | 250 GB included        |
| Storage              | 1 GB                | 100 GB included        |
| Auth MAUs            | 50,000              | 100,000 included       |
| Realtime connections | 200 concurrent      | 500 concurrent         |
| Backups              | None                | Daily, 7-day retention |
| Pause behavior       | Pauses after 7 days | Never pauses           |

At 100-1000 users, you'll stay well within Pro plan limits on everything.

### Cost Control

- **Enable the Spend Cap** immediately (Settings > Billing). This prevents overages by capping resources at included amounts. Remove it later once you understand usage patterns.
- Set billing alerts at 50%, 75%, and 90% thresholds
- Monitor usage in Dashboard > Reports

### Common Cost Traps

- **Realtime connections**: Each browser tab = 1 connection. 500 users with 2 tabs = 1000 connections = overage. Only subscribe to realtime on pages that need it, and unsubscribe on unmount.
- **Storage**: Don't cache TMDB images in Supabase storage — serve them from TMDB's CDN directly.
- **Bandwidth**: Always `.select()` specific columns, not full rows. A query returning 50 columns when you need 3 wastes bandwidth.
- **Auth MAUs**: Counted monthly. 1000 users = 1000 MAU, well within the 100K limit.

### Connection Pooling

Your app uses the Supabase JS client, which goes through PostgREST (REST API), not direct Postgres connections. This is already effectively pooled — no additional configuration needed.

If you ever add Prisma, Drizzle, or direct Postgres connections, use Supavisor on port 6543 (transaction mode) for serverless compatibility.

### RLS Performance Tips

- Always wrap `auth.uid()` in a subselect: `USING (user_id = (SELECT auth.uid()))` — evaluated once instead of per-row
- Avoid joins in RLS policies — use security definer functions for complex authorization checks
- Index every column referenced in your RLS policies (`user_id`, `club_id`, etc.)

### Backup Strategy

- Pro plan includes daily backups with 7-day retention — sufficient for launch
- **Point-in-Time Recovery (PITR)** is $100/mo — add it once you have data you can't afford to lose (paying users, months of festival history)
- As an extra safety net, run occasional `pg_dump` exports via the direct connection string

### Security Hardening

- `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS — never expose it to the client. Grep your codebase: any file with `'use client'` must never import it.
- Disable unused auth providers in Dashboard > Authentication > Providers
- Consider network restrictions on direct database access (Dashboard > Settings > Database > Network Restrictions)

### Audit Query: Find Tables Without RLS

Run this in the SQL editor to find unprotected tables:

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_policies WHERE schemaname = 'public'
);
```

---

## 3. Vercel Production Setup

### Why Pro Plan ($20/mo)

The Hobby plan prohibits commercial use. Pro is required.

| Resource             | Hobby (Free) | Pro ($20/mo) |
| -------------------- | ------------ | ------------ |
| Commercial use       | No           | Yes          |
| Bandwidth            | 100 GB       | 1 TB         |
| Function invocations | 1M           | 10M          |
| Image optimizations  | 1,000        | 5,000        |
| Build minutes        | 100          | 400          |
| Concurrent builds    | 1            | 3            |
| Spend management     | No           | Yes          |
| Log drains           | No           | Yes          |

Pro includes a $20 usage credit that covers compute costs. At your scale, you'll likely stay within this credit for months.

### Cost Control

- **Set spend alert at $50 and hard cap at $100** (Settings > Billing > Spend Management)
- Vercel alerts at 50%, 75%, and 100% via email and SMS
- Monitor usage in the Vercel dashboard

### Common Cost Traps

- **Image optimization**: Each unique URL + size + format = 1 optimization. With TMDB posters at multiple responsive breakpoints, you can burn through 5,000/month. Always set `sizes` on `next/image` to limit generated variants. Use consistent sizes.
- **SSR on every request**: Your `staleTimes: { dynamic: 3600 }` config already helps. Add ISR (`revalidate = 3600`) to semi-static pages like movie details and person pages.
- **Bot traffic**: Bots spike invocations and bandwidth. Vercel's built-in bot protection helps.
- **Build minutes**: Run `tsc --noEmit` and lint locally before pushing to avoid wasted builds.

### Performance Optimization

**Caching layers to set up:**

- **ISR** on movie/person pages: `export const revalidate = 3600` — TMDB data barely changes
- **On-demand revalidation**: Call `revalidateTag()` or `revalidatePath()` when users rate movies, create festivals, etc.
- **Cache Components**: Already enabled (`cacheComponents: true`) — use `'use cache'` directive on expensive data-fetching components
- **Client Router Cache**: Already set to 1 hour (`staleTimes: { dynamic: 3600 }`)

**Image optimization:**

- Always set `sizes` on `next/image` — this is the single biggest optimization. Example for a poster grid: `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"`
- Use `priority` on above-the-fold hero images
- Skip optimization for tiny images (<10KB): `unoptimized={true}`

**Bundle size:**

- Dynamic import heavy libraries (TipTap editor, recharts, canvas-confetti, dnd-kit) — they're not needed on initial page load
- Your `optimizePackageImports` and `reactCompiler: true` configs are already good

### Cold Starts

Fluid Compute largely solves this:

- 99.37% of requests have zero cold starts
- Pro plan keeps at least one instance warm (no scaling to zero)
- Multiple requests share a single warm instance

### Region Matching (Important)

If your Vercel functions run in US East but your Supabase is in US West, every database query adds ~60ms of latency. Check both dashboards and make sure they're in the same region.

### Deployment Strategy

- Every push to a non-production branch creates a preview deployment with a unique URL
- Use separate Supabase URLs for preview vs production environments to avoid polluting production data
- **Rolling Releases** (available on Pro): Canary deployments that split traffic between current and new versions. Monitor for 15-30 minutes before completing rollout.
- **Instant Rollback**: Vercel keeps all previous deployments. One-click rollback from the dashboard.

### Common Production Gotchas

1. **Case sensitivity**: Mac is case-insensitive, Vercel (Linux) is case-sensitive. `import UserAvatar from './userAvatar'` works locally, fails on Vercel. Run `git config core.ignorecase false` locally.
2. **Missing env vars**: Build succeeds but runtime crashes. Always double-check after adding new variables.
3. **TypeScript strictness**: `next dev` treats TS errors as warnings. `next build` (Vercel) treats them as fatal.
4. **`NEXT_PUBLIC_` var changes require redeploy**: They're baked in at build time, not read at runtime.
5. **Server action file exports**: Files with `'use server'` can ONLY export async functions — no constants, no types, no re-exports.

---

## 4. TMDB API

### Cost

Free with proper attribution. TMDB reserves the right to charge for commercial use but has historically never done so. If you monetize, consider reaching out to TMDB about a commercial license.

### Rate Limits

- 50 requests/second per IP, 20 simultaneous connections
- At your scale with Next.js caching, you'll never come close

### Caching (Already Good)

Your TMDB client already caches well:

- Search results: 1 hour revalidation
- Movie/person details: 24 hour revalidation
- Also caching results in your `movies` table

### Image CDN — Use Smaller Sizes

Use the right size for the right context:

- **Poster thumbnails** (cards, lists): `w185` or `w342` instead of `w500`
- **Poster detail view**: `w500`
- **Profile thumbnails**: `w185` instead of `w500`
- **Backdrop hero**: `w1280` (avoid `original` — can be multi-megabyte)
- **Blur placeholders**: `w92`

### Attribution (Legally Required)

You **must** do all of these:

1. Display the TMDB logo somewhere in your app (About page, footer, or credits section)
2. Include the text: "This product uses the TMDB API but is not endorsed or certified by TMDB."
3. The TMDB logo must be less prominent than the BackRow logo
4. Refer to them only as "TMDB" or "The Movie Database"

Check your app — if this attribution is missing, add it before launch.

### API Key Security

Your current setup uses query parameters (`?api_key=...`). The more secure approach is Bearer token in the Authorization header. Since all TMDB calls happen server-side, the risk is moderate, but switching to Bearer token is best practice (keys in URLs get logged in server/CDN access logs). You'd use the "API Read Access Token" from your TMDB account settings.

---

## 5. Error Monitoring (Sentry)

### Pricing

| Plan             | Price  | Errors/month | Users     |
| ---------------- | ------ | ------------ | --------- |
| Developer (Free) | $0     | 5,000        | 1         |
| Team             | $29/mo | 50,000       | Unlimited |

The free plan is sufficient for launch. 5K errors/month for 100-1000 users is plenty if you filter noise. The 1-user limit means only you can access the dashboard — upgrade to Team if you add a co-developer.

### Setup for Next.js App Router

Sentry requires three initialization files:

- `instrumentation-client.ts` — client-side (browser)
- `sentry.server.config.ts` — server-side (Node.js)
- `sentry.edge.config.ts` — edge runtime (if applicable)

Plus wrapping `next.config.ts` with `withSentryConfig`.

Sentry has a Vercel Marketplace integration that auto-configures environment variables.

### What to Ignore (Noise Filtering)

These errors are meaningless — filter them out in your Sentry config:

```typescript
Sentry.init({
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error exception captured",
    /AbortError/,
    /TypeError: Failed to fetch/,
    /TypeError: NetworkError/,
    /TypeError: Load failed/,
  ],
  denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
});
```

Also enable Sentry's built-in Inbound Filters to block legacy browsers, browser extensions, web crawlers, and localhost events.

### Performance Monitoring

Worth enabling at 10% sample rate (`tracesSampleRate: 0.1`). Captures page load times, API route durations, and database query timing. Increase to 25-50% once you understand your volume.

### Privacy

- Enable "Prevent Storing IP Addresses" in Sentry project settings (GDPR)
- When calling `Sentry.setUser()`, only pass an opaque user ID — not email or name
- Use `beforeSend` callback to strip any PII before it leaves the browser

### Cost Optimization

- Enable Spike Protection (prevents runaway errors from burning quota)
- Set rate limits (e.g., 100 errors/minute per project key)
- Use `beforeSend` to drop errors you don't care about before they count
- Sample performance at 10%, not 100%
- Review Stats > Usage weekly

---

## 6. Uptime & Monitoring Stack

### Recommended Stack (All Free at Your Scale)

| Layer             | Tool                  | Cost | What It Does                                  |
| ----------------- | --------------------- | ---- | --------------------------------------------- |
| Error tracking    | Sentry                | $0   | Captures and groups JS/server errors          |
| Uptime monitoring | UptimeRobot           | $0   | 50 monitors, 5-min checks, email/Slack alerts |
| Web analytics     | Vercel Analytics      | $0   | Page views, visitors, referrers               |
| Performance       | Vercel Speed Insights | $0   | Core Web Vitals per route                     |
| Logs              | Vercel built-in       | $0   | Function and build logs                       |

### What to Alert On

**Alert immediately (phone/SMS):**

- Site is down (2+ consecutive uptime check failures)
- Error rate spikes above 5x normal
- Auth system failure

**Alert via email/Slack (check within hours):**

- TMDB API errors (degraded movie data)
- Elevated error rate (2-3x normal)
- Slow response times (p95 > 3 seconds)

**Log silently (review weekly):**

- Individual 404s
- Bot/crawler errors
- Client-side network errors

### Alerting Advice

Start minimal. Alert fatigue kills monitoring discipline. Two alerts (site down + error spike) is enough at launch. Add more as you learn what matters.

Spend 15 minutes per week reviewing Sentry errors and uptime reports. This catches slow-burn issues that don't trigger alerts.

---

## 7. Cost Summary

### Monthly Costs at Launch (100-1000 users)

| Service             | Plan             | Monthly Cost     |
| ------------------- | ---------------- | ---------------- |
| Supabase            | Pro              | $25              |
| Vercel              | Pro (1 seat)     | $20              |
| Sentry              | Developer (Free) | $0               |
| UptimeRobot         | Free             | $0               |
| TMDB API            | Free             | $0               |
| Domain (backrow.tv) | Annual           | ~$3/mo amortized |
| **Total**           |                  | **~$48/mo**      |

### When Costs Increase

- **PITR backups**: +$100/mo when you have data worth protecting with point-in-time recovery
- **Sentry Team**: +$29/mo if you add a second developer
- **Vercel overages**: Unlikely at your scale, but image optimizations are the first thing to watch
- **Supabase overages**: Unlikely with spend cap enabled. Realtime connections are the first thing to watch if you add live features.

### Cost Optimization Tips

- Keep the Supabase spend cap ON until you understand your usage patterns
- Set Vercel spend alerts early
- Use ISR and caching aggressively to reduce function invocations
- Serve TMDB images from their CDN, don't store them in Supabase
- Use smaller TMDB image sizes for thumbnails (`w185` instead of `w500`)
- Dynamic import heavy client libraries to reduce bundle size and load times
- Filter Sentry noise aggressively to stay within the free 5K errors/month

---

## 8. Production Checklists

### Supabase Checklist

```
[ ] Pro plan activated under backrow.tv email
[ ] Spend cap enabled
[ ] Billing alerts set (50%, 75%, 90%)
[ ] Region matches Vercel function region
[ ] All migrations run successfully
[ ] Site URL set to https://backrow.tv
[ ] Redirect URLs configured (backrow.tv/** and *.vercel.app/**)
[ ] OAuth providers configured with production redirect URIs
[ ] Email templates customized with BackRow branding
[ ] Email confirmation enabled
[ ] Unused auth providers disabled
[ ] All tables have RLS policies (run audit query)
[ ] All RLS policies use (SELECT auth.uid()) subselect pattern
[ ] Service role key only used server-side
[ ] Daily backups verified (automatic on Pro)
```

### Vercel Checklist

```
[ ] Pro plan activated
[ ] Spend alert set ($50) and hard cap set ($100)
[ ] All environment variables set for production
[ ] SUPABASE_SERVICE_ROLE_KEY marked as Sensitive
[ ] NEXT_PUBLIC_ENABLE_TEST_AUTH NOT set in production
[ ] Domain configured (backrow.tv)
[ ] www redirect configured
[ ] SSL certificate provisioned (automatic)
[ ] Region matches Supabase region
[ ] Vercel Analytics enabled
[ ] Speed Insights enabled
[ ] Cron jobs verified (only run on production deployment)
```

### TMDB Checklist

```
[ ] Attribution displayed in app (logo + disclaimer text)
[ ] API key is server-side only (no NEXT_PUBLIC_ prefix)
[ ] Image sizes optimized per context (w185 for thumbnails, w500 for detail, w1280 for heroes)
[ ] No "original" size images in production
```

### Monitoring Checklist

```
[ ] Sentry integrated (client + server)
[ ] Sentry noise filters configured
[ ] Sentry Spike Protection enabled
[ ] UptimeRobot monitoring backrow.tv
[ ] UptimeRobot monitoring /api/health
```

### Pre-Launch Verification

```
[ ] Sign up flow works on production URL
[ ] Sign in flow works (email + OAuth)
[ ] Password reset flow works
[ ] Magic link flow works
[ ] Create a club works
[ ] Invite a member works
[ ] TMDB search returns results
[ ] Movie posters load correctly
[ ] Cron jobs fire on schedule
[ ] No console errors on key pages
[ ] Mobile responsive on real device
```
