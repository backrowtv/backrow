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
/blog                # Blog
/contact             # Contact form
/create-club         # Create club CTA
/faq                 # FAQ
/subscriptions       # Subscription plans
/terms-of-use        # Terms of use
/user-agreement      # User agreement
/privacy-policy      # Privacy policy
```

### Dashboard Routes (Authenticated)

```
/home                # Home feed (Goodreads-style 3-column layout)
/clubs               # User's clubs list + Following tab for public clubs
/clubs/new           # Create new club (wizard flow)
/club/[slug]         # Club overview/activity (NOTE: singular /club/ not /clubs/)
/club/[slug]/discuss                       # Club discussions
/club/[slug]/discuss/[thread-slug]         # Discussion thread detail
/club/[slug]/members                       # Club members
/club/[slug]/calendar                      # Club calendar
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

/admin               # Site admin dashboard (admin only)
```

### API Routes

```
/api/cron/advance-festivals              # Hourly: Auto-advance festival phases
/api/cron/rollover-seasons               # Monthly: Create new seasons
/api/cron/archive-notifications          # Daily: Archive old notifications
/api/cron/delete-archived-notifications  # Weekly: Clean up archived
/api/cron/process-polls                  # Process expired polls
/api/tmdb/search                         # TMDB movie search
/api/tmdb/credits                        # TMDB credits
/api/tmdb/search-people                  # TMDB person search
/api/film-news                           # RSS film news feed
/api/movie-headlines                     # Movie headlines
/api/health                              # Health check endpoint
/api/export                              # Data export
/api/upcoming-movies                     # Upcoming movie releases
/api/discussions/existing                # Check existing discussions
/api/events/[eventId]/ics                # Calendar ICS download
/api/clubs/[clubId]/festivals            # Club festivals API
```

---

## Database Schema (65+ Tables)

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
- **discussion_thread_tags** - Multi-entity tagging (movies, actors, directors, festivals)
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

Located in `/src/app/actions/` (142 files across 10 modular subdirectories + root-level files):

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
│   ├── actions/             # Server actions (142 files, 10 subdirectories)
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

**Project Completion:** Production-ready, pre-launch

### Recent Changes (April 2026)

- ✅ Ratings System Overhaul — All ratings numeric 0.0-10.0, no icon/visual modes
- ✅ Server Actions Modularization — Monolithic files split into 10 subdirectories
- ✅ Route Consolidation — Admin routes consolidated to `/manage/*`
- ✅ Favorite Movies/Persons — Favorite button on movie and person pages
- ✅ Production Audit — Launch guide and pre-launch checklist complete
- ✅ Auth Flow Redesign — Simplified sign-in/sign-up pages
- ✅ Club Creation Wizard — Streamlined wizard flow
- ✅ Performance Optimizations — React Compiler, package import optimization

### Previous Completions

- ✅ User Rubrics, User Moderation, Club Events, Navigation Preferences
- ✅ Discussion Thread Tags and Slugs, Fuzzy Search, Movie Certifications
- ✅ Slug-based routing for movies and persons
- ✅ Festival Type Lock, Admin Dashboard, Badge System
- ✅ RLS Performance Optimizations (`(SELECT auth.uid())` pattern)
- ✅ Letterboxd import (shipped — see `src/lib/letterboxd/import.ts` and club manage import wizard)
- ✅ Push notifications (shipped — Web Push API + VAPID, opt-in via /profile/settings/notifications)

### Remaining Work

- Production deployment (launch guide ready)

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
