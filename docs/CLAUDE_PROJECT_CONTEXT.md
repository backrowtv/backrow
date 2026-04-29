# BackRow - Project Context for Claude

**Last Updated:** April 2026
**Repository:** https://github.com/backrowtv/backrow.git
**Branch:** main

---

## What is BackRow?

BackRow is a **movie social platform** for running themed film festivals with friends. Think of it as "Goodreads for movies" meets "fantasy sports for film clubs." Users create or join clubs, run festivals with different themes, nominate and vote on movies, watch them together, and compete on leaderboards.

### Core Concepts

- **Clubs:** Private or public groups that run festivals together
- **Festivals:** Time-bound events with themes where members nominate, vote, and watch movies
- **Seasons:** Yearly containers for festivals with cumulative leaderboards
- **Themes:** Categories like "80s Horror," "Best Picture Winners," "Director Spotlight"
- **Nominations:** Members nominate movies that fit the theme
- **Voting:** Members vote on nominations, winner becomes the festival's featured film
- **Points/Leaderboards:** Track who nominates winners, participation, etc.

---

## Tech Stack

| Layer             | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| **Framework**     | Next.js 16.2.1 (App Router, React 19.2.4, Turbopack) |
| **Language**      | TypeScript 6.0.2 (strict mode)                       |
| **Database**      | Supabase (PostgreSQL + Auth + RLS)                   |
| **Styling**       | Tailwind CSS 4.2.2 + CSS Variables                   |
| **UI Components** | shadcn/ui (customized with Sage Green design system) |
| **Movie Data**    | TMDB API                                             |
| **Deployment**    | Vercel                                               |

---

## Route Structure

### Marketing Routes (Unauthenticated)

```
/                     # Landing page (marketing) or Home (if authenticated)
/sign-in             # Sign in page
/sign-up             # Sign up page
/sign-up/confirm     # Email-verification confirmation landing
/blog                # Blog
/contact             # Contact form (layered rate limit)
/cookie-settings     # Cookie consent management (CCPA)
/create-club         # Create club CTA
/do-not-sell-or-share # CCPA "Do Not Sell or Share" page
/faq                 # FAQ
/subscriptions       # Subscription plans
/terms-of-use        # Terms of use
/user-agreement      # User agreement
/privacy-policy      # Privacy policy
/welcome/username    # OAuth username picker (mandatory after first OAuth sign-in)
/auth/callback       # OAuth callback handler (Supabase redirect target)
```

### Dashboard Routes (Authenticated)

```
/home                # Home feed (Goodreads-style 3-column layout)
/clubs               # User's clubs list + Following tab for public clubs
/club/[slug]         # Club overview/activity (NOTE: singular /club/ not /clubs/)
/club/[slug]/discuss                       # Club discussions
/club/[slug]/discuss/[thread-slug]         # Discussion thread detail
/club/[slug]/discuss/[thread-slug]/comment/[commentId]  # Deep-link to a single comment
/club/[slug]/members                       # Club members
/club/[slug]/history                       # Club history
/club/[slug]/display-case                  # Club display case
/club/[slug]/stats                         # Club statistics
/club/[slug]/events                        # Club events
/club/[slug]/polls                         # Club polls
/club/[slug]/endless                       # Endless festival mode
/club/[slug]/timeline                      # Club timeline
/club/[slug]/upcoming                      # Upcoming movies
/club/[slug]/year-in-review-[year]         # Annual summary
/club/[slug]/settings                      # Club settings hub
/club/[slug]/settings/general              # General club settings
/club/[slug]/settings/notifications        # Club notification settings
/club/[slug]/settings/personalization      # Club personalization
/club/[slug]/manage                        # Admin management hub
/club/[slug]/manage/announcements          # Manage announcements
/club/[slug]/manage/club-management        # Club management
/club/[slug]/manage/festival               # Festival management
/club/[slug]/manage/homepage-movies        # Homepage movies
/club/[slug]/manage/import-history         # Letterboxd / external import history
/club/[slug]/manage/season                 # Season management
/club/[slug]/season/[season-slug]          # Season detail + leaderboard
/club/[slug]/festival/[festival-slug]      # Festival detail

/activity            # Global activity feed
/calendar            # Calendar view
/search              # Full search page with filters
/discover            # Discover public clubs, movies, people
/timeline            # Timeline - deadlines and dates from clubs
/feedback            # Bug reports and feedback
/join/[slug]         # Join club by code/password

/movies/[id]         # Movie detail (supports slug or TMDB ID)
/person/[id]         # Person detail (supports slug or TMDB ID)

/profile             # Current user profile
/profile/[userId]    # Other user's profile
/profile/edit        # Edit profile
/profile/display-case # User's display case (favorites)
/profile/nominations # Nomination history
/profile/stats       # User statistics
/profile/year-in-review-[year] # Annual user summary

/profile/settings            # User settings main page
/profile/settings/account    # Account settings (includes blocked users)
/profile/settings/notifications # Notification settings
/profile/settings/ratings    # Rating preferences (step increment, slider icon, rubrics)
/profile/settings/display    # Sidebar customization
/profile/settings/subscriptions # Subscription management

/admin                       # Site admin dashboard (admin only)
/admin/overview              # Admin overview metrics
/admin/announcements         # Manage site announcements
/admin/badges                # Badge management
/admin/collections           # Curated collections
/admin/components            # Component catalog (admin-only design reference)
/admin/feedback              # User feedback management
/admin/settings              # Site admin settings
/admin/users                 # User management
```

### API Routes

Authoritative list lives in `docs/backrow-site-map.md`. Summary:

```
# Account lifecycle (auth + email gate)
/api/account/delete                      # Soft-delete + schedule 30-day hard-delete
/api/account/export                      # Enqueue user-data export ZIP

# Brand assets
/api/brand/wordmark                      # Wordmark SVG renderer

# Clubs
/api/clubs                               # List/lookup helpers
/api/clubs/[clubId]                      # Club detail
/api/clubs/[clubId]/festivals            # Club festivals

# Cron (CRON_SECRET-gated)
/api/cron/advance-festivals              # Hourly: auto-advance festival phases
/api/cron/archive-notifications          # Daily: archive notifications older than 30 days
/api/cron/cleanup-job-dedup              # Nightly: TTL the job_dedup table
/api/cron/delete-archived-notifications  # Weekly: purge archived notifications
/api/cron/orphan-sweep                   # Weekly: expired exports + soft-deleted comments
/api/cron/process-polls                  # Process expired polls
/api/cron/rollover-seasons               # Monthly: new seasons

# Discussions
/api/discussions/existing                # Check existing discussion threads

# Events
/api/events/[eventId]/ics                # ICS download

# Health
/api/health                              # Health check endpoint

# Icons (PWA + favicons; 8 endpoints under /api/icons/*)

# Job workers (queue-bound, not internet-addressable)
/api/jobs/account-export
/api/jobs/account-hard-delete
/api/jobs/bulk-email
/api/jobs/image-processing
/api/jobs/notification-fanout

# Marketing data
/api/film-news                           # RSS film-news passthrough
/api/movie-headlines                     # Marketing landing headline aggregator
/api/upcoming-movies                     # Upcoming movie releases

# Migrations
/api/migrations/apply-notification-archiving

# TMDB proxy
/api/tmdb/credits
/api/tmdb/search
/api/tmdb/search-people
```

---

## Database Schema (76 tables)

### Core Tables

- **users** - User profiles, preferences, favorites, rating_preferences
- **clubs** - Club details, settings, festival_type (standard/endless)
- **club_members** - User-club relationships, roles (producer, director, critic)
- **seasons** - Yearly containers for festivals
- **festivals** - Festival instances with themes, phases, dates, poster_url, theme_source
- **nominations** - Movie nominations for festivals (supports endless_status, display_slot)
- **ratings** - User ratings for movies (always 0-10 scale, displayed as X.X)
- **festival_results** - Cached points/rankings (NEVER recalculate, always use cached)
- **movies** - Cached TMDB movie data with slugs, certification
- **persons** - Cached TMDB person data with slugs

### Social Tables

- **discussion_threads** - Discussion threads within clubs (with slugs)
- **discussion_comments** - Comments on discussions
- **discussion_thread_tags** - Multi-entity tagging (movies, people, festivals). The `person` tag type covers anyone in TMDB — actors, directors, writers, composers, etc.
- **private_notes** - Personal movie notes (multiple per movie allowed)
- **activity_log** - Club activity events
- **notifications** - User notifications

### Events & Polls

- **club_events** - Club events (watch parties, discussions, meetups)
- **club_event_rsvps** - Event RSVPs (going/maybe/not_going)
- **club_polls** - Club polls
- **club_poll_votes** - Poll votes

### Moderation & Privacy

- **user_blocks** - User-level blocking
- **user_reports** - User reporting for moderation

### Rubrics System

- **user_rubrics** - Personal rating rubric library
- **festival_rubric_locks** - Lock rubric choice per festival

### Supporting Tables

- **theme_pool** - Available themes for festivals
- **theme_pool_votes** - Theme upvotes/downvotes
- **club_announcements** - Club announcements (simple and rich HTML)
- **future_nomination_list** - User movie wishlist
- **background_images** - Customizable backgrounds (club, festival, home, user)
- **curated_collections** - Admin-managed movie collections
- **watch_history** - User watch history with watch_count

---

## Key Patterns & Rules

### Next.js 16 Patterns

```typescript
// ✅ ALWAYS await dynamic APIs
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params; // MUST await
  const { query } = await searchParams; // MUST await
  const cookieStore = await cookies(); // MUST await
  const headerList = await headers(); // MUST await
}

// ✅ Server Components are default (no directive needed)
// ✅ Only add 'use client' when you need interactivity
```

### Supabase Patterns

```typescript
// Server Components - use server client
import { createClient } from "@/lib/supabase/server";

export default async function ServerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // ✅ getUser() for auth
}

// Client Components - use browser client
("use client");
import { createClient } from "@/lib/supabase/client";

export function ClientComponent() {
  const supabase = createClient();
  // Can use getSession() for UI checks, but getUser() for sensitive ops
}
```

### Slug-Based Routing

**Movies:** `/movies/[slug]` where slug = `title-year` (e.g., `the-matrix-1999`)

- Supports both slugs and TMDB IDs for backwards compatibility
- TMDB IDs redirect to slug URL

**Persons:** `/person/[slug]` where slug = `name-birthyear` (e.g., `tom-hanks-1956`)

- TMDB IDs auto-redirect to slug URL
- Persons are cached in `persons` table on first access

```typescript
// Movie slug generation
function generateMovieSlug(title: string, year: number): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${year}`;
}

// Person slug generation
function generatePersonSlug(name: string, birthday: string): string {
  const birthYear = birthday.split("-")[0];
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${birthYear}`;
}
```

### Critical Database Rules

1. **NEVER recalculate `festival_results` points** - Always use cached values
2. **NEVER change `season_id` after festival creation**
3. **ALWAYS quote reserved keywords** like "cast" in queries
4. **ALWAYS use `getUser()` for auth** in server components (not `getSession()`)

---

## Festival Modes

### Festival Types

- **Standard Festival:** Has distinct phases (Theme → Nomination → Voting → Watching → Complete)
- **Endless Festival:** Always in nomination/voting, no fixed end date

### Club Festival Types

- **Standard:** Competitive festivals with phases, scoring, seasons, and standings
- **Endless:** Casual continuous watching without phases or competition

### Festival Phases

1. **Theme Selection** (`theme_selection`) — Director picks theme or members vote
2. **Nomination** (`nomination`) — Members nominate movies fitting the theme
3. **Watch & Rate** (`watch_rate`) — Members watch and rate nominated movies
4. **Results** (`results`) — Final scores calculated, standings updated

### Festival Type Lock (January 2026)

- Once a festival starts in a season, `festival_type` cannot be changed
- Enforced by database trigger `enforce_festival_type_lock`
- Prevents mode changes mid-season for consistency

---

## UI Components & Design System

### Brand Colors (Sage Green Design System)

- **Primary:** Sage Green (`hsl(158 30% 35%)`) - Main brand color, CTAs
- **Accent:** Rose (`hsl(346 78% 55%)`) - Highlights, notifications
- **Secondary:** Teal variations - Secondary actions, badges
- **Background:** Dark theme default (`hsl(160 15% 6%)`)

### Component Imports

```typescript
// UI Components (shadcn/ui)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Custom Components
import { Text } from "@/components/ui/text"; // Typography
import { DateDisplay } from "@/components/ui/date-display"; // Date formatting (SSR-safe)
```

### Date Handling (Important!)

```typescript
// ❌ NEVER use locale date methods in Server Components (hydration mismatch)
date.toLocaleDateString()

// ✅ ALWAYS use DateDisplay component
<DateDisplay date={festival.start_date} format="date" />
<DateDisplay date={festival.created_at} format="relative" />
```

---

## Server Actions

Located in `/src/app/actions/` (146 files across 10 modular subdirectories + root-level files):

```
actions/
├── auth/                # Login, signup, logout, password, account (6 files)
├── clubs/               # Club CRUD, membership, settings, moderation (14 files)
├── discussions/         # Threads, comments, voting, tags, spoilers (9 files)
├── endless-festival/    # Pool, voting, watch history, status (11 files)
├── events/              # Club events, RSVPs, queries (6 files)
├── festivals/           # CRUD, phases, results, auto-advance (7 files)
├── members/             # Member queries (2 files)
├── profile/             # Favorites, blocking, stats, preferences (9 files)
├── seasons/             # CRUD, queries, transitions (4 files)
├── themes/              # Pool, voting, selection (5 files)
├── index.ts             # Barrel exports with namespace imports
├── ratings.ts           # User ratings
├── results.ts           # Festival results
├── nominations.ts       # Nominate movies
├── movies.ts            # Cache movies, get by slug
├── persons.ts           # Cache persons, get by slug
├── search.ts            # Search functionality
├── notes.ts             # Movie notes (multiple per movie)
├── notifications.ts     # User notifications
├── rubrics.ts           # User personal rubrics
├── club-rubrics.ts      # Club rubric preferences
├── admin.ts             # Site admin functions
├── admin-festival.ts    # Festival administration
├── backgrounds.ts       # Customizable backgrounds
├── display-preferences.ts   # UI preferences
├── navigation-preferences.ts # Sidebar customization
├── backrow-matinee.ts   # Matinee mode operations
├── curated-collections.ts # Admin movie collections
├── feedback.ts          # User feedback/bug reports
├── guesses.ts           # Nomination guesses
├── standings.ts         # Leaderboard standings
├── badges.ts            # Badge system
├── id-card.ts           # ID card customization
└── ...                  # ~67 root-level files total
```

---

## Search System

### Command Search (⌘K)

- Debounced search across movies, festivals, notes, actors, directors, composers, discussions
- Shows 3 results per category with "View all" links
- Links to `/search` page for full results

### Full Search Page

- Filters by type (movies, festivals, actors, directors, composers, notes, discussions)
- Pagination support
- Caches persons on first search for slug URLs

---

## TMDB Integration

```typescript
import {
  getMovieDetails,
  getPersonDetails,
  searchMovies,
  searchPeople,
  getPosterUrl,
  getWatchProviders,
} from "@/lib/tmdb/client";

// Movie details include credits, runtime, genres, etc.
const movie = await getMovieDetails(tmdbId);

// Person details include biography, filmography
const person = await getPersonDetails(tmdbId);
```

---

## Authentication Flow

1. User signs up → Supabase Auth creates user
2. Database trigger creates `users` row
3. Server components use `getUser()` for auth checks
4. Club permissions checked via `club_memberships` table
5. RLS policies enforce access control

### Roles

- **Producer (Owner):** Full club control, can manage everything, transfer ownership, delete club
- **Director (Admin):** Can manage festivals, announcements, polls, limited member control
- **Critic (Member):** Can nominate, vote, participate, create discussions

---

## Cron Jobs (Vercel)

| Job                             | Schedule | Purpose                                          |
| ------------------------------- | -------- | ------------------------------------------------ |
| `advance-festivals`             | Hourly   | Move festivals through phases based on dates     |
| `rollover-seasons`              | Monthly  | Create new seasons on Jan 1                      |
| `archive-notifications`         | Daily    | Archive notifications older than 30 days         |
| `delete-archived-notifications` | Weekly   | Delete archived notifications older than 90 days |
| `cleanup-job-dedup`             | Nightly  | TTL the `job_dedup` table (7-day retention)      |
| `orphan-sweep`                  | Weekly   | Expired exports + 30d soft-deleted comments      |
| `process-polls`                 | Hourly   | Run actions on expired polls                     |

---

## File Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup routes
│   ├── (dashboard)/         # Authenticated routes
│   │   ├── admin/           # Site admin dashboard
│   │   ├── club/[slug]/     # Club pages (NOTE: singular /club/)
│   │   ├── clubs/           # Clubs list, create new
│   │   ├── movies/[id]/     # Movie detail (slug or TMDB ID)
│   │   ├── person/[id]/     # Person detail (slug or TMDB ID)
│   │   ├── profile/         # User profile pages
│   │   ├── search/          # Search page
│   │   ├── activity/        # Global activity feed
│   │   ├── calendar/        # Calendar view
│   │   ├── discover/        # Discover clubs/movies
│   │   └── timeline/        # Timeline - deadlines and dates
│   ├── (marketing)/         # Public marketing pages
│   ├── actions/             # Server actions (146 files, 10 subdirectories)
│   └── api/                 # API routes (cron jobs)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components (sidebar, header)
│   ├── admin/               # Admin dashboard components
│   ├── clubs/               # Club-specific components
│   ├── festivals/           # Festival components
│   ├── events/              # Event components
│   ├── discussions/         # Discussion components
│   ├── ratings/             # Rating/rubric components
│   ├── movies/              # Movie components
│   ├── profile/             # Profile components
│   ├── pwa/                 # PWA components
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── server.ts        # Server-side Supabase client
│   │   ├── client.ts        # Browser Supabase client
│   │   └── middleware.ts    # Auth middleware
│   ├── tmdb/
│   │   └── client.ts        # TMDB API client
│   ├── ratings/             # Rating utilities
│   ├── persons/             # Person utilities
│   ├── validation/          # Input validation
│   └── utils.ts             # Utility functions (cn, etc.)
├── hooks/                   # Custom React hooks
├── contexts/                # React contexts
└── types/
    ├── database.ts          # Auto-generated Supabase types
    └── user-rating-preferences.ts # Rating preferences types
```

---

## Current Status (April 2026)

**Project Completion:** Production-ready, pre-launch.

### Auth callback flow + welcome/username picker

- OAuth flow lands on `/auth/callback`, exchanges the code, and redirects
  to `/welcome/username` when the user has no canonical username.
- Username picker is mandatory after first OAuth sign-in. Atomic on signup
  (commit-or-roll-back).
- Wizard signup, OAuth callback, and email signup all auto-join
  `backrow-featured` via `src/lib/users/autoJoinFeatured.ts`.

### Username cooldown

- Username changes carry a 6-month cooldown (180 days, see
  `USERNAME_CHANGE_COOLDOWN_DAYS` in `src/app/actions/auth/username-validation.ts`).
- Display name has no cooldown — always editable.

### Notification lifecycle

- Bell popout exposes `archiveAllNotifications()` ("Clear all"); the action
  archives every unarchived notification for the user.
- The standalone `/notifications` page route was removed (see commit
  `ae8aead`); the bell popout is the only entry point.

### Discussion thread edit history

- Migration `0012` added `is_edited`, `edited_at`, and `edit_history JSONB`
  on `discussion_threads`. The thread modal renders the latest version
  with an "edited" badge and a history dropdown.

### Recent changes (audit window)

- Vercel bot-detection layer removed (Apr 20) after iOS Safari false
  positives. Rate limits, auth, and email verification are the only
  write-path defenses.
- Layered burst+sustained rate limit on `/contact` (3/min + 20/hr) plus
  `sanitizeForStorage` on stored fields. Shared `isValidEmail()` helper in
  `src/lib/security/validators.ts` replaces inline regex copies.
- `escapeLike()` (`src/lib/security/postgrest-escape.ts`) wraps user input
  on every `.or()` and interpolated `.ilike()` site. See `docs/security.md`.
- `retryWithBackoff()` (`src/lib/retry.ts`) wraps every TMDB fetch and
  every `sendEmail` call.
- Marketing landing rebuild — lead with club archetypes, push festival
  flow below.
- CCPA features — cookie banner, `/cookie-settings`, GPC signal,
  `/do-not-sell-or-share` page.
- Migrations 0013 (storage RLS subselect form), 0014 (`get_user_club_stats`
  RPC, replaces JS aggregation in `clubs/queries.ts`), 0015 (flushes legacy
  `floatingButtonCorner` and removes `migrateCornerToPosition`).
- ~70 mutating server actions retrofitted with `actionRateLimit` +
  `requireVerifiedEmail`. Coverage table in `docs/security.md` is
  authoritative.
- Path-based `revalidatePath` calls converted to tag-based `invalidate*`
  helpers. New `CacheTags.curatedPick` + `invalidateCuratedPick` for the
  marketing curated slot.
- Generated Supabase types live at `src/lib/supabase/database.types.ts`
  (regenerate with `bun run db:gen-types`). Factories are deliberately
  untyped pending reconciliation with the generated `Database` type;
  individual queries opt into typing via `.returns<T>()`.

### Previous completions

- User Rubrics, User Moderation, Club Events, Navigation Preferences
- Discussion Thread Tags and Slugs, Fuzzy Search, Movie Certifications
- Slug-based routing for movies and persons
- Festival Type Lock, Admin Dashboard, Badge System
- RLS Performance Optimizations (`(SELECT auth.uid())` pattern)
- Letterboxd import (`src/lib/letterboxd/import.ts` + manage wizard)
- Push notifications (Web Push API + VAPID, opt-in via
  `/profile/settings/notifications`)

---

## Quick Reference

### Common Imports

```typescript
// Supabase
import { createClient } from "@/lib/supabase/server"; // Server
import { createClient } from "@/lib/supabase/client"; // Client

// TMDB
import { getMovieDetails, getPersonDetails, searchMovies } from "@/lib/tmdb/client";

// Actions
import { getMovie, getMovieBySlug } from "@/app/actions/movies";
import { getPerson, getPersonBySlug } from "@/app/actions/persons";
import { getUserRubrics, createUserRubric } from "@/app/actions/rubrics";
import { getClubEvents, createEvent } from "@/app/actions/events";
import { blockUser, unblockUser } from "@/app/actions/profile";

// UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormattedDate } from "@/components/ui/FormattedDate"; // SSR-safe dates
import { FormattedTime } from "@/components/ui/FormattedTime"; // SSR-safe times
```

### Component Decision Tree

```
Need interactivity (useState, useEffect, event handlers)?
├─ NO → Server Component (default, no directive)
└─ YES → Client Component ('use client' at top)
```

### Environment

- **Dev:** Local Supabase (ports 54321-54328)
- **Prod:** Supabase Cloud + Vercel
- **TMDB API Key:** Required in env vars

---

## Questions to Ask Me (Claude)

When working on BackRow, feel free to ask about:

- Specific database schema details
- Festival phase transitions
- Club permission checks
- TMDB data caching strategy
- Component implementation patterns
- Server action patterns
- Search optimization
- Any routing or navigation questions

I have full context on the codebase and can provide specific code examples or implementation guidance.
