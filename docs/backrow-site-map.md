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
- `/forgot-password` - Forgot password page
- `/reset-password` - Reset password page

### (marketing) Route Group

**Layout**: Marketing layout (no sidebar, no dashboard padding)

- `/` - Landing page (when not authenticated)
- `/blog` - Blog page
- `/contact` - Contact page
- `/create-club` - Create club CTA
- `/faq` - FAQ page
- `/privacy-policy` - Privacy policy
- `/subscriptions` - Subscriptions page
- `/terms-of-use` - Terms of use
- `/user-agreement` - User agreement

### (dashboard) Route Group

**Layout**: Dashboard layout (auth check, onboarding wrapper, email verification banner)

#### Main Dashboard Pages

- `/home` - Authenticated home (3-column: HomeSidebar, HomeFeed, HomeWidgets)
- `/clubs` - Clubs list page (tabs: All, Owner, Admin, Member, Following)
- `/clubs/new` - Create new club (wizard flow)
- `/activity` - Global activity feed
- `/calendar` - Global calendar
- `/discover` - Discover page
- `/feedback` - Bug reports and feedback
- `/join/[slug]` - Join club by code/password
- `/search` - Search page
- `/timeline` - Timeline — deadlines and dates from clubs

#### Club Routes (`/club/[slug]`)

**Layout**: Club layout (auth + membership check)

- `/club/[slug]` - Club detail page (hero festival, announcements, calendar, members)
- `/club/[slug]/calendar` - Club calendar page
- `/club/[slug]/discuss` - Discussion page
- `/club/[slug]/discuss/[thread-slug]` - Discussion thread detail
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
- `/admin/feedback` - User feedback
- `/admin/settings` - Admin settings
- `/admin/users` - User management

#### Utility Routes

- `/test-auth` - Test auth widget (dev only)
- `/test-styling` - Test styling catalog (dev only)
- `/dashboard` - Dashboard redirect

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

## Page Count Summary

| Route Group | Pages  |
| ----------- | ------ |
| Auth        | 4      |
| Marketing   | 9      |
| Dashboard   | 62     |
| API         | 17     |
| **Total**   | **92** |
