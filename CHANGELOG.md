# Changelog

All notable changes to BackRow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Security

- **XSS Protection**: Added HTML sanitization for rich text content using DOMPurify
  - New `src/lib/security/sanitize.ts` utility with `sanitizeHtml()`, `sanitizeForStorage()`, and `escapeHtml()` functions
  - TipTap editor now sanitizes content before rendering
  - Announcements are sanitized before database storage
- **Security Headers**: Added Content Security Policy and other security headers via middleware
  - CSP with strict defaults, allowing necessary image and API domains
  - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy headers
  - HSTS header for HTTPS enforcement

#### Accessibility

- **Skip Link**: Added "Skip to main content" link for keyboard navigation
  - Visible on focus, hidden otherwise
  - Links to `#main-content` anchor in dashboard layout

#### Features

- **Feedback System**: Users can submit bug reports and feature requests
  - Tables: `feedback_items`, `feedback_votes`
  - Upvoting system with toggle behavior
  - Status tracking: open, in_progress, resolved, closed, wont_fix
  - Admin-only status management
  - Migration: `20260128000000_create_feedback_system.sql`

- **Site Admin System**: Role-based site administration
  - Table: `site_admins` with `is_site_admin()` helper function
  - Admin dashboard at `/admin` route
  - Features: site stats, announcements, featured club selection
  - Migration: `20260124000000_create_site_admins.sql`

- **Club Movie Pool**: Independent movie pool for clubs
  - Table: `club_movie_pool` (separate from festival nominations)
  - Works with both standard and endless festival clubs
  - Soft delete support via `deleted_at` column
  - Migration: `20260201000000_create_club_movie_pool.sql`

- **Events System**: Club event management with RSVP
  - Tables: `club_events`, `club_event_rsvps`
  - Event types: watch_party, discussion, meetup, custom
  - RSVP statuses: going, maybe, not_going
  - Migration: `20251230000000_create_club_events.sql`

- **Enhanced Discussions**: Improved discussion thread features
  - Thread tags system with `discussion_thread_tags` table
  - Slugified thread URLs for SEO
  - Comment voting system
  - Auto-thread creation for movies
  - Migration: `20260113000000_create_discussion_thread_tags.sql`

- **Timeline View**: Unified timeline visualization
  - New components in `src/components/timeline/`
  - TimelineItem, TimelineSection, TimelineView components
  - Compact and detailed layouts

- **User Rubrics System**: Personal rating rubrics
  - Table: `user_rubrics` for custom rating criteria
  - Club-specific rubric preferences
  - Migration: `20260111000000_create_user_rubrics_system.sql`

- **User Blocks and Reports**: Safety features
  - Tables: `user_blocks`, `user_reports`
  - Block users from seeing your content
  - Report inappropriate content
  - Migration: `20260110000000_create_user_blocks_reports.sql`

#### Developer Experience

- **Cursor Integration**: 32+ custom commands for rapid development
  - Commands: dev, build, test, lint, type-check, db-migrate, etc.
  - 16 comprehensive rule files in `.cursor/rules/`
- **Pre-commit Hooks**: Automated code quality checks
  - ESLint, Prettier, TypeScript type checking
  - Mac-compatible bash scripts

### Changed

#### Framework

- **Next.js 16**: Upgraded from Next.js 15
  - Cache Components enabled with `cacheComponents: true`
  - Server Actions body limit increased to 16MB for file uploads
  - Client-side Router Cache with 1-hour stale times
- **React 19**: Updated to React 19.2.3
- **Tailwind CSS 4**: Updated to Tailwind CSS 4.1

#### Database

- **Rating Normalization**: All ratings normalized to 10-point scale
  - Migration: `20260117000000_normalize_ratings_to_10_scale.sql`
- **RLS Performance**: Optimized 43 RLS policies to use `(SELECT auth.uid())` pattern
  - Critical for query performance
  - Migration: `20260125000000_fix_rls_performance_and_security.sql`

#### Routes

- **Timeline Page**: Renamed from `/upcoming` to `/timeline`
- **Nominations Page**: Renamed from `/profile/future-nominations` to `/profile/nominations`

### Fixed

- **RLS Performance**: Fixed 43 policies using direct `auth.uid()` calls
  - Added 4 missing foreign key indexes
  - Fixed 5 functions with mutable search_path
- **Duplicate Discussion Threads**: Fixed trigger creating duplicates
  - Migration: `20260123000000_fix_duplicate_discussion_threads.sql`
- **Movie Thread Trigger**: Fixed for movie pool feature
  - Migration: `20260131000000_fix_movie_thread_trigger_for_pool.sql`

### Security

- Added XSS sanitization for all user-generated HTML content
- Added Content Security Policy headers
- Added security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Fixed RLS policies for proper auth checks

### Deprecated

- None

### Removed

- **Relume Integration**: Removed Relume AI prompts and rules
- **Onboarding Wizard**: Removed legacy onboarding flow (replaced with streamlined signup)

---

## [0.1.0] - 2024-12-01

### Added

- Initial release of BackRow
- Movie club creation and management
- Festival mode with themed movie selections
- TMDB integration for movie data
- Supabase authentication and database
- Real-time notifications
- Activity feed
- Member management
- Rating and voting system

---

[Unreleased]: https://github.com/backrowtv/backrow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/backrowtv/backrow/releases/tag/v0.1.0
