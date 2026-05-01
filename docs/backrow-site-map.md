# BackRow Site Map

Complete route structure and page hierarchy for BackRow application.

## Route Groups

### Root Layout (`/`)

- **Conditional**: Shows authenticated home if logged in, marketing landing if not
- **Layout**: Root layout with TopNav, ConditionalLayout

### (auth) Route Group

**Layout**: No special layout (uses root)

- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/sign-up/confirm` - Email-verification confirmation landing
- `/forgot-password` - Forgot password page
- `/reset-password` - Reset password page

### Root page

- `/` - Landing page (`src/app/page.tsx`); routes to marketing landing if not authenticated, home if authenticated.

### (marketing) Route Group

**Layout**: Marketing layout (no sidebar, no dashboard padding)

- `/acknowledgments` - Third-party data providers, sign-in providers, and external services attribution
- `/blog` - Blog page
- `/contact` - Contact page (public form, layered rate limit)
- `/cookie-settings` - Cookie consent management (CCPA)
- `/create-club` - Create club CTA
- `/do-not-sell-or-share` - Do Not Sell or Share My Personal Information (CCPA)
- `/faq` - FAQ page
- `/privacy-policy` - Privacy policy
- `/subscriptions` - Subscriptions page
- `/terms-of-use` - Terms of use
- `/user-agreement` - User agreement

### Welcome / callback (top-level, not in a group)

- `/welcome/username` - OAuth username picker (mandatory after first OAuth sign-in)
- `/auth/callback` - OAuth callback handler (Supabase redirect target)

### (dashboard) Route Group

**Layout**: Dashboard layout (auth check, onboarding wrapper, email verification banner)

#### Main Dashboard Pages

- `/home` - Authenticated home (3-column: HomeSidebar, HomeFeed, HomeWidgets)
- `/dashboard` - Dashboard redirect to `/home`
- `/clubs` - Clubs list page (tabs: All, Owner, Admin, Member, Following)
- `/activity` - Global activity feed
- `/calendar` - Global calendar
- `/discover` - Discover page
- `/feedback` - Bug reports and feedback
- `/join/[slug]` - Join club by code/password
- `/search` - Search page
- `/timeline` - Timeline — deadlines and dates from clubs

> Note: `/clubs/new` is a permanent redirect to `/create-club`
> (`next.config.ts`); not enumerated as its own page.

#### Club Routes (`/club/[slug]`)

**Layout**: Club layout (auth + membership check)

- `/club/[slug]` - Club detail page (hero festival, announcements, calendar, members)
- `/club/[slug]/discuss` - Discussion list page
- `/club/[slug]/discuss/[thread-slug]` - Discussion thread detail
- `/club/[slug]/discuss/[thread-slug]/comment/[commentId]` - Deep-link to a single comment
- `/club/[slug]/display-case` - Display case page
- `/club/[slug]/endless` - Endless festival mode
- `/club/[slug]/events` - Club events
- `/club/[slug]/history` - Club history page
- `/club/[slug]/members` - Members list page
- `/club/[slug]/polls` - Club polls
- `/club/[slug]/stats` - Club stats page
- `/club/[slug]/timeline` - Club timeline
- `/club/[slug]/upcoming` - Upcoming movies
- `/club/[slug]/year-in-review-[year]` - Year wrap page

**Festival Routes:**

- `/club/[slug]/festival/[festival-slug]` - Festival detail page (phase timeline, nominations, ratings, results)

**Season Routes:**

- `/club/[slug]/season/[season-slug]` - Season detail page (festivals list, standings)

**Settings Routes (`/club/[slug]/settings`):**

- `/club/[slug]/settings` - Club settings hub
- `/club/[slug]/settings/general` - General club settings
- `/club/[slug]/settings/notifications` - Notification settings
- `/club/[slug]/settings/personalization` - Personalization settings

**Manage Routes (`/club/[slug]/manage`) — Producer/Director only:**

- `/club/[slug]/manage` - Management hub
- `/club/[slug]/manage/announcements` - Manage announcements
- `/club/[slug]/manage/club-management` - Club management
- `/club/[slug]/manage/festival` - Festival management
- `/club/[slug]/manage/homepage-movies` - Homepage movies
- `/club/[slug]/manage/import-history` - Letterboxd / external import history
- `/club/[slug]/manage/season` - Season management

#### Profile Routes (`/profile`)

**Layout**: Profile layout (cover + avatar, profile info, stats bar, ProfileNavigation)

- `/profile` - Profile main page
- `/profile/[userId]` - Other user's profile
- `/profile/display-case` - Display case page
- `/profile/edit` - Edit profile page
- `/profile/nominations` - Nomination history
- `/profile/stats` - Profile stats page
- `/profile/year-in-review-[year]` - Year wrap page

**Settings Routes (`/profile/settings`):**

- `/profile/settings` - Profile settings main
- `/profile/settings/account` - Account settings (includes blocked users)
- `/profile/settings/display` - Display preferences
- `/profile/settings/notifications` - Notification settings
- `/profile/settings/ratings` - Rating preferences (step increment, slider icon, rubrics)
- `/profile/settings/subscriptions` - Subscription settings

#### Content Routes

- `/movies/[id]` - Movie detail page (supports slug or TMDB ID)
- `/person/[id]` - Person detail page (supports slug or TMDB ID)

#### Admin Routes (`/admin`)

- `/admin` - Admin dashboard
- `/admin/overview` - Admin overview
- `/admin/announcements` - Site announcements
- `/admin/badges` - Badge management
- `/admin/collections` - Curated collections
- `/admin/components` - Component catalog (admin-only design reference)
- `/admin/feedback` - User feedback
- `/admin/settings` - Admin settings
- `/admin/users` - User management

#### Utility Routes

- `/test-auth` - Test auth widget (dev only)
- `/test-styling` - Test styling catalog (dev only)

## API Routes

Every `src/app/api/**/route.ts` endpoint. Authentication model varies — cron
routes accept `CRON_SECRET` bearer; queue workers run as system via
`experimentalTriggers` in `vercel.json`; user-callable routes match the
write-path posture in `docs/security.md`.

### Account lifecycle

- `/api/account/delete` - Soft-delete the account, schedule the 30-day hard-delete worker
- `/api/account/export` - Enqueue an account-export job, email the signed ZIP

### Auth callback (top-level)

- `/auth/callback` - Page-level OAuth handler; not under `/api`. See Welcome / callback group above.

### Brand assets

- `/api/brand/wordmark` - Wordmark PNG renderer via `@vercel/og` (Righteous TTF + primary color). For email templates that can't tolerate dynamic-route flakiness, serve the pre-rendered `public/wordmark.png` instead — regenerate with `bun run wordmark:render` (`scripts/render-wordmark.mjs`).

### Clubs

- `/api/clubs` - List/create-helper endpoints (used by client search/autocomplete)
- `/api/clubs/[clubId]` - Club detail endpoint
- `/api/clubs/[clubId]/festivals` - Club festival list

### Cron (CRON_SECRET-gated)

- `/api/cron/advance-festivals` - Hourly: auto-advance festival phases
- `/api/cron/archive-notifications` - Daily: archive notifications older than 30 days
- `/api/cron/cleanup-job-dedup` - Nightly: TTL the `job_dedup` table
- `/api/cron/delete-archived-notifications` - Weekly: purge archived notifications
- `/api/cron/orphan-sweep` - Weekly: delete expired export ZIPs and hard-delete soft-deleted comments
- `/api/cron/process-polls` - Process expired polls
- `/api/cron/rollover-seasons` - Monthly: create new seasons

### Discussions

- `/api/discussions/existing` - Lookup auto-created discussion threads (movie/person/festival)

### Events

- `/api/events/[eventId]/ics` - Calendar ICS download for an event

### Icons (PWA + favicons)

- `/api/icons/apple-dark`, `/api/icons/apple-light`
- `/api/icons/club-backrow-dark`, `/api/icons/club-backrow-light`
- `/api/icons/favicon-dark`, `/api/icons/favicon-light`
- `/api/icons/pwa-192`, `/api/icons/pwa-512`

### Job workers (queue-bound, not internet-addressable)

- `/api/jobs/account-export` - Build + email user data export
- `/api/jobs/account-hard-delete` - 30-day hard-delete worker
- `/api/jobs/bulk-email` - Per-recipient send via Resend
- `/api/jobs/image-processing` - Sharp resize + thumbnail variants
- `/api/jobs/notification-fanout` - Notification + push fan-out per club

### Marketing data

- `/api/film-news` - RSS film-news passthrough
- `/api/movie-headlines` - Headline aggregator for the marketing landing
- `/api/upcoming-movies` - Upcoming movie releases

### Migrations

- `/api/migrations/apply-notification-archiving` - One-shot migration helper

### Health

- `/api/health` - Health check endpoint

### TMDB proxy

- `/api/tmdb/credits` - TMDB credits proxy
- `/api/tmdb/search` - TMDB movie search proxy
- `/api/tmdb/search-people` - TMDB person search proxy

## Layout Patterns

### Root Layout

- TopNav (global navigation)
- ConditionalLayout (switches between dashboard and marketing)
- SidebarProvider, MobileSidebarProvider
- Toaster (notifications)

### Dashboard Layout

- OnboardingWrapper (checks if user needs onboarding)
- EmailVerificationBanner (if email not verified)
- Wraps all dashboard pages

### Marketing Layout

- Minimal layout (no sidebar, no dashboard padding)
- Full-width marketing pages

### Club Layout

- Auth check
- Membership check
- ClubNavigation component
- Wraps all club pages

### Profile Layout

- ProfileNavigation
- Cover + Avatar section
- Profile info section
- Stats bar
- Main content area

## Dynamic Route Patterns

- `[slug]` - Club slug (alphanumeric)
- `[id]` - Slug or TMDB ID (movies, persons)
- `[season-slug]` - Season slug
- `[festival-slug]` - Festival slug
- `[year]` - Year (4 digits)
- `[userId]` - User ID
- `[thread-slug]` - Discussion thread slug
- `[commentId]` - Comment UUID (deep-link)
- `[clubId]` - Club UUID (API routes)
- `[eventId]` - Event UUID (API routes)

## Page Count Summary

Counts derive from `find src/app -name 'page.tsx'` and
`find src/app/api -name 'route.ts'` at the time of writing.

| Route Group        | Pages   |
| ------------------ | ------- |
| Root               | 1       |
| Auth               | 5       |
| Marketing          | 11      |
| Welcome / callback | 1       |
| Dashboard          | 62      |
| API routes         | 25      |
| **Total**          | **105** |
