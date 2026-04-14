# Activity Feed Complete Guide

**Last Updated:** December 2025

This guide describes every action that triggers an activity feed update and how it's displayed to users.

---

## 📊 Activity Feed Overview

BackRow uses a **two-tier activity system**:

- **🏛️ Club Activities** - Visible to all club members (shows club-level events)
- **👤 Member Activities** - Private to each user (shows personal actions)

---

## 🏛️ Club Activities (Visible to All Members)

These activities appear in the club's activity feed and are visible to all club members.

### 👥 Member Changes

| Trigger              | Display Format                                        | Avatar    | Links To               |
| -------------------- | ----------------------------------------------------- | --------- | ---------------------- |
| User joins club      | "A new member joined in **[Club Name]**"              | Club icon | `/club/[slug]/members` |
| Multiple users join  | "3 new members joined in **[Club Name]**" _(grouped)_ | Club icon | `/club/[slug]/members` |
| User leaves/removed  | "A member left from **[Club Name]**"                  | Club icon | `/club/[slug]/members` |
| Multiple users leave | "2 members left from **[Club Name]**" _(grouped)_     | Club icon | `/club/[slug]/members` |

### 🎬 Festival Lifecycle

| Trigger          | Display Format                                                                       | Avatar    | Links To                     |
| ---------------- | ------------------------------------------------------------------------------------ | --------- | ---------------------------- |
| Festival starts  | **"[Festival Theme]" festival started in [Club Name]** _(theme is clickable link)_   | Club icon | `/club/[slug]/festival/[id]` |
| Phase changes    | "Festival moved to **Nominations/Watch & Rate/Results** phase in [Club Name]"        | Club icon | `/club/[slug]/festival/[id]` |
| Results revealed | **"[Movie Title]" wins "[Festival Theme]"!** _(movie and theme are clickable links)_ | Club icon | `/club/[slug]/festival/[id]` |

**Phase Display:**

- `nomination` → "Nominations"
- `watch_rate` → "Watch & Rate"
- `results` → "Results"

### 📢 Content & Communication

| Trigger             | Display Format                                         | Avatar    | Links To       |
| ------------------- | ------------------------------------------------------ | --------- | -------------- |
| Announcement posted | "New announcement in **[Club Name]**: **\"[Title]\"**" | Club icon | `/club/[slug]` |
| Poll created        | "New poll in **[Club Name]**: **\"[Question]\"**"      | Club icon | `/club/[slug]` |

### 📅 Events

| Trigger         | Display Format                                                                 | Avatar    | Links To              |
| --------------- | ------------------------------------------------------------------------------ | --------- | --------------------- |
| Event created   | **"[Event Title]" scheduled in [Club Name]** _(event title is clickable link)_ | Club icon | `/club/[slug]/events` |
| Event modified  | **"[Event Title]" was updated in [Club Name]**                                 | Club icon | `/club/[slug]/events` |
| Event cancelled | **"[Event Title]" was cancelled in [Club Name]**                               | Club icon | `/club/[slug]/events` |

### ⚙️ Club Changes

| Trigger       | Display Format                       | Avatar    | Links To       |
| ------------- | ------------------------------------ | --------- | -------------- |
| Club renamed  | "Club renamed to **\"[New Name]\"**" | Club icon | `/club/[slug]` |
| Club archived | "**[Club Name]** was archived"       | Club icon | `/club/[slug]` |

### 📆 Seasons

| Trigger              | Display Format                                        | Avatar    | Links To       |
| -------------------- | ----------------------------------------------------- | --------- | -------------- |
| Season starts        | **"[Season Name]" season started in [Club Name]**     | Club icon | `/club/[slug]` |
| Season ends          | **"[Season Name]" season ended in [Club Name]**       | Club icon | `/club/[slug]` |
| Season renamed       | "Season renamed to **\"[New Name]\"** in [Club Name]" | Club icon | `/club/[slug]` |
| Season dates changed | "Season dates were updated in **[Club Name]**"        | Club icon | `/club/[slug]` |

### 🎞️ Endless Festival (Casual Mode)

| Trigger              | Display Format                                                                | Avatar       | Links To       |
| -------------------- | ----------------------------------------------------------------------------- | ------------ | -------------- |
| Movie added to pool  | **"[Movie Title]" added to movie pool in [Club Name]** _(movie poster shown)_ | Movie poster | `/club/[slug]` |
| Movie starts playing | "Now Showing: **\"[Movie Title]\"** in [Club Name]" _(movie poster shown)_    | Movie poster | `/club/[slug]` |
| Movie completed      | **"[Movie Title]" concluded in [Club Name]** _(movie poster shown)_           | Movie poster | `/club/[slug]` |

---

## 👤 Member Activities (Private to User)

These activities only appear in the user's personal activity feed. Other users cannot see them.

### 🏠 Club Membership (Personal View)

| Trigger                  | Display Format                                                       | Avatar      | Links To                    |
| ------------------------ | -------------------------------------------------------------------- | ----------- | --------------------------- |
| You join a club          | "[Your Name] Joined **[Club Name]**" _(club name is clickable link)_ | Your avatar | `/club/[slug]`              |
| You leave a club         | "[Your Name] Left **[Club Name]**"                                   | Your avatar | `/club/[slug]`              |
| You're blocked from club | "[Your Name] Blocked from **[Club Name]**"                           | Your avatar | `/profile/settings/account` |

### 🎯 Club Management (As Producer)

| Trigger            | Display Format                         | Avatar      | Links To       |
| ------------------ | -------------------------------------- | ----------- | -------------- |
| You create a club  | "[Your Name] Created **[Club Name]**"  | Your avatar | `/club/[slug]` |
| You archive a club | "[Your Name] Archived **[Club Name]**" | Your avatar | `/club/[slug]` |

### 🍿 Watch Activity

| Trigger                 | Display Format                                                                | Avatar      | Links To              |
| ----------------------- | ----------------------------------------------------------------------------- | ----------- | --------------------- |
| You mark movie watched  | "[Your Name] watched **\"[Movie Title]\"** in [Club Name] ([Festival Theme])" | Your avatar | `/movies/[tmdb_id]`   |
| Multiple movies watched | "[Your Name] Watched **3 movies**" _(grouped same day)_                       | Your avatar | `/home?filter=movies` |

**Context Display:**

- Shows club name if within a club context
- Shows festival theme in parentheses if applicable
- Example: _"watched \"The Shawshank Redemption\" in Film Buffs (Best Prison Movies)"_

### ⭐ Rating Activity

| Trigger                       | Display Format                                                   | Avatar      | Links To              |
| ----------------------------- | ---------------------------------------------------------------- | ----------- | --------------------- |
| You rate a movie (first time) | "[Your Name] rated **\"[Movie Title]\"** _(8/10)_"               | Your avatar | `/movies/[tmdb_id]`   |
| You change a rating           | "[Your Name] changed rating for **\"[Movie Title]\"** to _7/10_" | Your avatar | `/movies/[tmdb_id]`   |
| Multiple ratings              | "[Your Name] Rated **5 movies**" _(grouped same day)_            | Your avatar | `/home?filter=movies` |

**Rating Display:**

- First-time rating shows: `rated "Movie Title" (8/10)`
- Rating change shows: `changed rating for "Movie Title" to 7/10`

### 🎬 Nomination Activity

| Trigger               | Display Format                                            | Avatar      | Links To                     |
| --------------------- | --------------------------------------------------------- | ----------- | ---------------------------- |
| You nominate a movie  | "[Your Name] nominated **\"[Movie Title]\"**"             | Your avatar | `/club/[slug]/festival/[id]` |
| You edit nomination   | "[Your Name] updated **\"[Movie Title]\"** nomination"    | Your avatar | `/club/[slug]/festival/[id]` |
| You remove nomination | "[Your Name] removed **\"[Movie Title]\"** nomination"    | Your avatar | `/club/[slug]/festival/[id]` |
| Multiple nominations  | "[Your Name] nominated **3 movies**" _(grouped same day)_ | Your avatar | `/home?filter=movies`        |

### 🎨 Theme Activity

| Trigger            | Display Format                                            | Avatar      | Links To              |
| ------------------ | --------------------------------------------------------- | ----------- | --------------------- |
| You submit a theme | "[Your Name] submitted theme: **\"[Theme Name]\"**"       | Your avatar | `/club/[slug]`        |
| You edit a theme   | "[Your Name] updated theme: **\"[Theme Name]\"**"         | Your avatar | `/club/[slug]`        |
| You remove a theme | "[Your Name] removed theme: **\"[Theme Name]\"**"         | Your avatar | `/club/[slug]`        |
| Multiple themes    | "[Your Name] submitted **3 themes**" _(grouped same day)_ | Your avatar | `/home?filter=movies` |

### 🔖 Future Nominations

| Trigger                            | Display Format                                                              | Avatar      | Links To              |
| ---------------------------------- | --------------------------------------------------------------------------- | ----------- | --------------------- |
| You add to future nominations      | "[Your Name] added **\"[Movie Title]\"** to future nominations"             | Your avatar | `/movies/[tmdb_id]`   |
| You remove from future nominations | "[Your Name] removed **\"[Movie Title]\"** from future nominations"         | Your avatar | `/movies/[tmdb_id]`   |
| Multiple future nominations        | "[Your Name] added **3 movies** to future nominations" _(grouped same day)_ | Your avatar | `/home?filter=movies` |

### 🏆 Badges

| Trigger          | Display Format                                   | Avatar      | Links To                            |
| ---------------- | ------------------------------------------------ | ----------- | ----------------------------------- |
| You earn a badge | "[Your Name] earned **\"[Badge Name]\"** badge!" | Your avatar | `/profile` (ID card badges section) |

### 🚫 User Blocking

| Trigger                | Display Format                        | Avatar      | Links To                    |
| ---------------------- | ------------------------------------- | ----------- | --------------------------- |
| You block another user | "[Your Name] Blocked **[User Name]**" | Your avatar | `/profile/settings/account` |

**Note:** This is user-level blocking (account-wide), not club-specific.

---

## 🎨 Visual Display Features

### Avatar Display

**Club Activities:**

- Shows **club icon** for all club-level activities
- For endless festival movie activities, shows **movie poster** instead

**Member Activities:**

- Shows **your avatar** for all personal activities
- Clicking avatar opens user profile popup

### Text Formatting & Links

All activity text includes **clickable links** to relevant content:

| Element                     | Link Color                 | Links To                     |
| --------------------------- | -------------------------- | ---------------------------- |
| Movie titles (in quotes)    | Primary color (Sage Green) | `/movies/[tmdb_id]`          |
| Festival themes (in quotes) | Accent color               | `/club/[slug]/festival/[id]` |
| Event titles (in quotes)    | Secondary color            | `/club/[slug]/events`        |
| Club names (no quotes)      | Accent color               | `/club/[slug]`               |

**Example:**

> _"The Shawshank Redemption"_ wins _"Best Prison Movies"_!
>
> _(Both the movie title and festival theme are clickable links)_

### 📱 Mobile Navigation (Touch-Optimized)

**Desktop Behavior:**

- Individual inline links remain clickable (precise navigation)
- Avatar clickable for user profile popup

**Mobile Behavior:**

- **Entire activity card is a single touch target** (meets app store requirements)
- Card navigation uses **smart routing logic**:

#### User/Member Activities

| Activity Type         | Mobile Navigation Target                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Watch/Rate activities | **Movie page** (`/movies/[tmdb_id]`) or **Filtered feed** (`/home?filter=movies`) if grouped        |
| Nomination activities | **Festival page** (context where nominated) or **Filtered feed** (`/home?filter=movies`) if grouped |
| Theme activities      | **Club page** (theme pool context) or **Filtered feed** (`/home?filter=movies`) if grouped          |
| Club join/leave       | **Club page** (`/club/[slug]`)                                                                      |
| Future nominations    | **Movie page** (`/movies/[tmdb_id]`) or **Filtered feed** (`/home?filter=movies`) if grouped        |
| Badge earned          | **Profile** (`/profile`, ID card badges section)                                                    |

#### Club Activities

| Activity Type                   | Mobile Navigation Target                         |
| ------------------------------- | ------------------------------------------------ |
| Member changes                  | **Members page** (`/club/[slug]/members`)        |
| Festival-specific (non-endless) | **Festival page** (`/club/[slug]/festival/[id]`) |
| Endless festival movies         | **Club page** (`/club/[slug]`)                   |
| Announcements                   | **Club page** (`/club/[slug]`)                   |
| Events                          | **Events page** (`/club/[slug]/events`)          |
| Polls                           | **Club page** (`/club/[slug]`)                   |
| Season changes                  | **Club page** (`/club/[slug]`)                   |
| Club settings                   | **Club page** (`/club/[slug]`)                   |

**Smart Logic Examples:**

- "watched 'Inception' in Film Buffs" → Navigate to `/movies/123` (movie page)
- "Watched 5 movies" → Navigate to `/home?filter=movies` (filtered activity feed)
- "nominated 'The Matrix'" → Navigate to `/club/film-buffs/festival/abc` (festival context)
- "'Best Sci-Fi' festival started in Film Buffs" → Navigate to `/club/film-buffs/festival/abc` (festival page)
- "A new member joined in Film Buffs" → Navigate to `/club/film-buffs/members` (members page)

### Grouping Behavior

Activities are automatically grouped when multiple similar actions occur on the same day:

**Club Activities Grouped:**

- Member joins/leaves
- Endless movies added/completed
- Events created

**Member Activities Grouped:**

- Movies watched
- Movies rated
- Nominations added
- Themes submitted
- Future nominations added
- Badges earned

**Display Format:**

- Single: "A new member joined"
- Multiple: "3 new members joined"

---

## ⏱️ Timestamp Display

All activities show **relative time** in the format:

- "Just now"
- "2m ago"
- "5h ago"
- "3d ago"
- "2w ago"

---

## 🔍 Filtering Options

Activity feeds can be filtered by:

- **All Activity** - Everything
- **Festivals** - Festival-related activities
- **Movies** - Movie watches, ratings, nominations
- **Members** - Member joins/leaves
- **Announcements** - Club announcements
- **Events & Polls** - Events and polls
- **Seasons** - Season changes
- **Club Settings** - Club configuration changes

---

## 📱 Context-Specific Feeds

### Home Page Feed

Shows **only your personal member activities** across all clubs.

### Club Page Feed

Shows **club activities** for that specific club (visible to all members).

### Profile Page Feed

Shows **only your personal activities** (same as home feed but from profile context).

---

## 🎯 Implementation Notes

### Activity Logging Functions

**For Club Activities:**

```typescript
await logClubActivity(clubId, "activity_type", {
  // details object with movie_title, festival_theme, etc.
});
```

**For Member Activities:**

```typescript
await logMemberActivity(
  userId,
  "activity_type",
  {
    // details object
  },
  clubId
); // clubId is optional
```

**For Dual Activities (both club and member):**

```typescript
await logDualActivity(clubId, userId, "club_activity", "member_activity", {
  // shared details
});
```

### Database Storage

- **Table:** `activity_log`
- **Archive:** `activity_log_archive` (automatic archiving of old entries)
- **Columns:**
  - `club_id` - For club activities (null for member-only)
  - `user_id` - For member activities (null for club-only)
  - `action` - Activity type string
  - `details` - JSONB with context (movie_title, club_name, etc.)
  - `created_at` - Timestamp

### RLS Policies

- Club activities: Visible to all club members
- Member activities: Only visible to the user who performed the action

---

## 📊 Activity Statistics

**Total Activity Types:** 41

- Club Activities: 20
- Member Activities: 21

**Implementation Status:** 100% implemented

- Favorites activity types removed (December 2025)
- Future nominations renamed from "watch later" (December 2025)

**Files:**

- Activity Types: [`src/lib/activity/activity-types.ts`](../src/lib/activity/activity-types.ts)
- Logger: [`src/lib/activity/logger.ts`](../src/lib/activity/logger.ts)
- Display: [`src/lib/activity/activity-verbiage.tsx`](../src/lib/activity/activity-verbiage.tsx)
- Feed Component: [`src/components/activity/ActivityFeed.tsx`](../src/components/activity/ActivityFeed.tsx)
