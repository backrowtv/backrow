# Backrow Architecture Documentation

> Generated from codebase analysis on 2025-12-11, updated 2026-04-09

> NOTE: This is a point-in-time snapshot. For current schema, see Supabase
> tables (or generate types via `supabase gen types typescript`); for current
> routes, see [docs/backrow-site-map.md](docs/backrow-site-map.md). Sections
> below may have drifted from the live codebase.

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Route Map](#2-route-map)
3. [User/Club/Membership Model](#3-userclubmembership-model)
4. [Festival State Machine](#4-festival-state-machine)
5. [Server Actions Inventory](#5-server-actions-inventory)
6. [RLS Policies Summary](#6-rls-policies-summary)
7. [Key Flows](#7-key-flows)
8. [Design Notes & Potential Issues](#8-design-notes--potential-issues)

---

## 1. Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    %% Core User Tables
    users ||--o| subscriptions : has
    users ||--o| user_stats : has
    users ||--o{ club_members : joins
    users ||--o{ nominations : creates
    users ||--o{ ratings : gives
    users ||--o{ notifications : receives
    users ||--o{ watch_history : tracks
    users ||--o{ user_badges : earns

    %% Club Tables
    clubs ||--o| club_stats : has
    clubs ||--o{ club_members : contains
    clubs ||--o{ seasons : has
    clubs ||--o{ festivals : hosts
    clubs ||--o{ club_announcements : publishes
    clubs ||--o{ club_polls : creates
    clubs ||--o{ club_events : schedules
    clubs ||--o{ theme_pool : maintains
    clubs ||--o{ discussion_threads : contains
    clubs ||--o{ blocked_users : manages

    %% Festival Tables
    seasons ||--o{ festivals : contains
    festivals ||--o{ nominations : accepts
    festivals ||--o| festival_results : produces
    festivals ||--o{ festival_standings : calculates
    festivals ||--o{ ratings : collects

    %% Nomination & Rating Tables
    nominations ||--o{ ratings : receives
    nominations ||--o{ movie_pool_votes : gets
    movies ||--o{ nominations : referenced_by
    movies ||--o{ watch_history : tracked_in
    movies ||--o{ private_notes : has

    %% Discussion Tables
    discussion_threads ||--o{ discussion_comments : contains
    discussion_threads ||--o{ discussion_votes : receives
    discussion_comments ||--o{ discussion_votes : receives

    %% Poll Tables
    club_polls ||--o{ club_poll_votes : receives

    %% Event Tables
    club_events ||--o{ club_event_rsvps : has

    %% Badge Tables
    badges ||--o{ user_badges : awarded_as

    %% Theme Pool
    theme_pool ||--o{ theme_pool_votes : receives

    %% Users Table
    users {
        uuid id PK
        string email
        string username
        string display_name
        string avatar_url
        string bio
        boolean email_verified
        int favorite_movie_tmdb_id FK
        int favorite_director_tmdb_id FK
        int favorite_actor_tmdb_id FK
        int favorite_composer_tmdb_id FK
        json social_links
        timestamp created_at
        timestamp updated_at
    }

    %% Subscriptions Table
    subscriptions {
        uuid id PK
        uuid user_id FK
        string plan
        string status
        string stripe_customer_id
        string stripe_subscription_id
        timestamp trial_ends_at
        timestamp current_period_end
        boolean cancel_at_period_end
        timestamp created_at
        timestamp updated_at
    }

    %% Clubs Table
    clubs {
        uuid id PK
        string name
        string description
        uuid producer_id FK
        string privacy
        string password_hash
        json settings
        string festival_type
        string slug
        boolean featured
        timestamp featured_at
        timestamp featured_until
        boolean archived
        timestamp created_at
        timestamp updated_at
    }

    %% Club Members Table
    club_members {
        uuid user_id PK_FK
        uuid club_id PK_FK
        string role
        timestamp joined_at
        string club_display_name
        string club_avatar_url
        string club_bio
    }

    %% Festivals Table
    festivals {
        uuid id PK
        uuid club_id FK
        uuid season_id FK
        string name
        string theme
        string slug
        string phase
        string status
        timestamp start_date
        timestamp nomination_deadline
        timestamp watch_deadline
        timestamp rating_deadline
        timestamp results_date
        int member_count_at_creation
        boolean auto_advance
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    %% Nominations Table
    nominations {
        uuid id PK
        uuid festival_id FK
        uuid user_id FK
        int tmdb_id FK
        string pitch
        timestamp completed_at
        boolean hidden_from_history
        timestamp created_at
        timestamp deleted_at
    }

    %% Ratings Table
    ratings {
        uuid id PK
        uuid festival_id FK
        uuid nomination_id FK
        uuid user_id FK
        decimal rating
        timestamp created_at
    }

    %% Movies Table
    movies {
        int tmdb_id PK
        string title
        int year
        string director
        string_array cast
        string_array genres
        int runtime
        decimal popularity_score
        string poster_url
        timestamp cached_at
    }

    %% Notifications Table
    notifications {
        uuid id PK
        uuid user_id FK
        string type
        string title
        string message
        string link
        uuid related_user_id FK
        uuid club_id FK
        uuid festival_id FK
        boolean read
        boolean archived
        timestamp archived_at
        timestamp created_at
    }

    %% Discussion Threads Table
    discussion_threads {
        uuid id PK
        uuid club_id FK
        uuid author_id FK
        string title
        text content
        string thread_type
        int tmdb_id FK
        string person_name
        string person_type
        uuid festival_id FK
        boolean is_pinned
        boolean is_locked
        boolean is_spoiler
        int upvotes
        int comment_count
        timestamp created_at
        timestamp updated_at
    }

    %% Activity Log Table
    activity_log {
        uuid id PK
        uuid user_id FK
        uuid club_id FK
        string action
        json details
        timestamp created_at
    }
```

### All Tables (65+ Total)

| Domain           | Table                            | Purpose                         | Key Relationships          |
| ---------------- | -------------------------------- | ------------------------------- | -------------------------- |
| **Core User**    | `users`                          | User accounts                   | FK to movies (favorites)   |
|                  | `subscriptions`                  | Stripe subscriptions            | 1:1 with users             |
|                  | `user_stats`                     | Aggregated user statistics      | 1:1 with users             |
|                  | `user_badges`                    | Earned achievements             | Junction: users ↔ badges   |
|                  | `watch_history`                  | Movies watched                  | users ↔ movies             |
|                  | `private_notes`                  | Personal movie notes            | users ↔ movies             |
|                  | `generic_ratings`                | Non-festival ratings            | users ↔ movies             |
|                  | `recommendation_list`            | Future watch list               | users ↔ movies             |
|                  | `future_nomination_list`         | Planned nominations             | users                      |
|                  | `future_nomination_links`        | Links for future nominations    | users                      |
|                  | `user_blocks`                    | User blocking                   | users ↔ users              |
|                  | `user_reports`                   | User reports                    | users ↔ users              |
|                  | `user_rubrics`                   | Custom rating rubrics           | users                      |
| **Club**         | `clubs`                          | Film clubs                      | FK to users (producer)     |
|                  | `club_members`                   | Membership junction             | users ↔ clubs              |
|                  | `club_invites`                   | Invite tokens for private clubs | clubs ↔ users              |
|                  | `club_stats`                     | Club statistics                 | 1:1 with clubs             |
|                  | `club_notes`                     | Club-specific movie notes       | clubs ↔ movies ↔ users     |
|                  | `club_announcements`             | Club announcements              | clubs ↔ users              |
|                  | `club_polls`                     | Club polls                      | clubs ↔ users              |
|                  | `club_poll_votes`                | Poll responses                  | club_polls ↔ users         |
|                  | `club_events`                    | Scheduled events                | clubs                      |
|                  | `club_event_rsvps`               | Event RSVPs                     | club_events ↔ users        |
|                  | `club_word_blacklist`            | Content moderation              | clubs                      |
|                  | `blocked_users`                  | Club member blocks              | clubs ↔ users              |
|                  | `favorite_clubs`                 | Favorited clubs                 | users ↔ clubs              |
| **Festival**     | `seasons`                        | Festival seasons                | clubs                      |
|                  | `festivals`                      | Film festivals                  | clubs ↔ seasons            |
|                  | `nominations`                    | Movie nominations               | festivals ↔ users ↔ movies |
|                  | `nomination_guesses`             | Who nominated what guesses      | festivals ↔ users          |
|                  | `festival_results`               | Final calculations              | 1:1 with festivals         |
|                  | `festival_standings`             | User rankings                   | festivals ↔ users          |
|                  | `ratings`                        | Festival movie ratings          | nominations ↔ users        |
|                  | `stack_rankings`                 | Ranked movie lists              | festivals ↔ users          |
|                  | `theme_pool`                     | Available themes                | clubs                      |
|                  | `theme_pool_votes`               | Theme voting                    | theme_pool ↔ users         |
|                  | `movie_pool_votes`               | Movie preference voting         | nominations ↔ users        |
| **Discussion**   | `discussion_threads`             | Discussion topics               | clubs ↔ users              |
|                  | `discussion_comments`            | Thread replies                  | discussion_threads ↔ users |
|                  | `discussion_votes`               | Upvotes                         | threads/comments ↔ users   |
|                  | `discussion_thread_unlocks`      | Spoiler unlock tracking         | threads ↔ users            |
|                  | `discussion_thread_tags`         | Thread categorization           | threads                    |
| **Messaging**    | `chat_messages`                  | Club chat                       | clubs ↔ users              |
|                  | `direct_messages`                | Private messages                | users ↔ users              |
| **Notification** | `notifications`                  | User notifications              | users                      |
|                  | `notification_delivery_log`      | Delivery tracking               | notifications              |
|                  | `notification_dead_letter_queue` | Failed deliveries               | notifications              |
|                  | `email_digest_log`               | Digest emails sent              | users                      |
| **System**       | `movies`                         | TMDB movie cache                | —                          |
|                  | `badges`                         | Achievement definitions         | —                          |
|                  | `activity_log`                   | Activity feed events            | users ↔ clubs              |
|                  | `activity_log_archive`           | Archived activities             | —                          |
|                  | `chat_messages_archive`          | Archived chat                   | —                          |
|                  | `contact_submissions`            | Contact form entries            | —                          |
|                  | `stripe_event_log`               | Webhook events                  | —                          |
|                  | `tmdb_search_cache`              | Search result cache             | —                          |
|                  | `background_images`              | Custom backgrounds              | —                          |
|                  | `backrow_matinee`                | Featured movie of week          | clubs ↔ movies             |
|                  | `curated_collections`            | Curated movie lists             | —                          |
|                  | `site_admins`                    | Site admin users                | users                      |
| **Feedback**     | `feedback_items`                 | Bug reports & feature requests  | users                      |
|                  | `feedback_votes`                 | Upvotes on feedback items       | feedback_items ↔ users     |

**Source Files:**

- Type definitions: [src/types/database.ts](src/types/database.ts)
- Migrations: [supabase/migrations/](supabase/migrations/)

---

## 2. Route Map

### Route Structure Flowchart

```mermaid
flowchart TB
    subgraph Public["Public Routes"]
        M1["/"] --> M2["/blog"]
        M1 --> M3["/contact"]
        M1 --> M4["/faq"]
        M1 --> M5["/subscriptions"]
        M1 --> M6["/terms-of-use"]
        M1 --> M7["/user-agreement"]
        M1 --> M8["/create-club"]
    end

    subgraph Auth["Auth Routes"]
        A1["/sign-in"] --> A2["/sign-up"]
        A1 --> A3["/forgot-password"]
        A3 --> A4["/reset-password"]
    end

    subgraph Dashboard["Dashboard Routes"]
        D1["/home"] --> D2["/activity"]
        D1 --> D3["/calendar"]
        D1 --> D4["/discover"]
        D1 --> D5["/search"]
        D1 --> D6["/timeline"]
        D1 --> D7["/feedback"]
        D1 --> D8["/clubs"]
        D8 --> D9["/clubs/new"]
        D1 --> D10["/join/[slug]"]
    end

    subgraph Club["Club Routes /club/[slug]"]
        C1["Main Page"] --> C2["/calendar"]
        C1 --> C3["/members"]
        C1 --> C4["/discuss"]
        C4 --> C4a["/discuss/[thread-slug]"]
        C1 --> C5["/stats"]
        C1 --> C6["/history"]
        C1 --> C7["/display-case"]
        C1 --> C8["/events"]
        C1 --> C9["/polls"]
        C1 --> C10["/settings"]
        C10 --> C10a["/settings/general"]
        C10 --> C10b["/settings/notifications"]
        C10 --> C10c["/settings/personalization"]
        C1 --> C11["/festival/[festival-slug]"]
        C1 --> C12["/season/[season-slug]"]
        C1 --> C13["/year-in-review-[year]"]
        C1 --> C14["/endless"]
        C1 --> C15["/timeline"]
        C1 --> C16["/upcoming"]
    end

    subgraph AdminRoutes["Club Admin Routes /club/[slug]/manage"]
        AD1["/manage"] --> AD2["/manage/announcements"]
        AD1 --> AD3["/manage/festival"]
        AD1 --> AD4["/manage/season"]
        AD1 --> AD5["/manage/club-management"]
        AD1 --> AD6["/manage/homepage-movies"]
    end

    subgraph Profile["Profile Routes"]
        P1["/profile"] --> P2["/profile/edit"]
        P1 --> P3["/profile/display-case"]
        P1 --> P4["/profile/nominations"]
        P1 --> P5["/profile/[userId]"]
        P1 --> P6["/profile/year-in-review-[year]"]
        P1 --> P7["/profile/settings"]
        P7 --> P7a["/profile/settings/account"]
        P7 --> P7b["/profile/settings/notifications"]
        P7 --> P7c["/profile/settings/subscriptions"]
        P7 --> P7d["/profile/settings/display"]
        P7 --> P7e["/profile/settings/ratings"]
        P1 --> P8["/profile/stats"]
    end

    subgraph Content["Content Routes"]
        CT1["/movies/[id]"]
        CT2["/person/[id]"]
    end

    subgraph API["API Routes"]
        API1["/api/cron/*"] --> API1a["advance-festivals"]
        API1 --> API1b["archive-notifications"]
        API1 --> API1c["delete-archived-notifications"]
        API1 --> API1d["process-polls"]
        API1 --> API1e["rollover-seasons"]
        API2["/api/tmdb/*"] --> API2a["search"]
        API2 --> API2b["credits"]
        API2 --> API2c["search-people"]
        API3["/api/film-news"]
        API4["/api/movie-headlines"]
        API5["/api/clubs/[clubId]/festivals"]
        API6["/api/health"]
        API7["/api/export"]
        API8["/api/upcoming-movies"]
        API9["/api/discussions/existing"]
        API10["/api/events/[eventId]/ics"]
    end
```

### Route Summary

| Route Group   | Layout                                                             | Pages | Purpose                    |
| ------------- | ------------------------------------------------------------------ | ----- | -------------------------- |
| `(marketing)` | [src/app/(marketing)/layout.tsx](<src/app/(marketing)/layout.tsx>) | 9     | Public landing pages       |
| `(auth)`      | [src/app/(auth)/layout.tsx](<src/app/(auth)/layout.tsx>)           | 4     | Authentication flows       |
| `(dashboard)` | [src/app/(dashboard)/layout.tsx](<src/app/(dashboard)/layout.tsx>) | 62    | Protected app features     |
| `api`         | —                                                                  | 17    | REST endpoints & cron jobs |

**Total: 92 routes**

---

## 3. User/Club/Membership Model

### Terminology

- **Member**: Anyone who belongs to a club (collective term for all users in a club)
- **Role**: A user's permission level within a club (Producer, Director, or Critic)
- **Critic**: The base-level role - a standard club member with participation rights but no admin privileges

All Producers, Directors, and Critics are "members" of a club. "Critic" specifically refers to the role level in the database.

### Role Hierarchy

```mermaid
flowchart TB
    subgraph Roles["Club Roles (all are members)"]
        Producer["Producer (Owner)"]
        Director["Director (Admin)"]
        Critic["Critic (Base Role)"]
    end

    Producer --> |"can promote/demote"| Director
    Producer --> |"can promote"| Critic
    Director --> |"can promote (only)"| Critic

    Producer --> |"full control"| ClubSettings
    Producer --> |"exclusive"| DeleteClub
    Producer --> |"exclusive"| TransferOwnership

    Director --> |"limited"| ClubSettings
    Director --> |"can create"| Festivals
    Director --> |"can manage"| Announcements
    Director --> |"can manage"| Polls
```

### Permission Matrix

| Permission              | Producer |      Director      | Critic |
| ----------------------- | :------: | :----------------: | :----: |
| **Club Management**     |
| Create club             |    —     |         —          |   —    |
| Edit club settings      |   Yes    |      Limited       |   No   |
| Delete/archive club     |   Yes    |         No         |   No   |
| Transfer ownership      |   Yes    |         No         |   No   |
| **Member Management**   |
| Invite members          |   Yes    |        Yes         |   No   |
| Remove members          |   Yes    | Yes (critics only) |   No   |
| Promote to director     |   Yes    |        Yes         |   No   |
| Demote director         |   Yes    |         No         |   No   |
| Block users             |   Yes    |        Yes         |   No   |
| **Festival Management** |
| Create festival         |   Yes    |        Yes         |   No   |
| Advance/revert phase    |   Yes    |        Yes         |   No   |
| Force advance phase     |   Yes    |        Yes         |   No   |
| Cancel festival         |   Yes    |        Yes         |   No   |
| Edit festival settings  |   Yes    |        Yes         |   No   |
| **Content Management**  |
| Create announcements    |   Yes    |        Yes         |   No   |
| Create polls            |   Yes    |        Yes         |   No   |
| Manage theme pool       |   Yes    |        Yes         |   No   |
| Pin discussion threads  |   Yes    |        Yes         |   No   |
| Moderate discussions    |   Yes    |        Yes         |   No   |
| **Participation**       |
| Nominate movies         |   Yes    |        Yes         |  Yes   |
| Rate movies             |   Yes    |        Yes         |  Yes   |
| Vote on themes          |   Yes    |        Yes         |  Yes   |
| Create discussions      |   Yes    |        Yes         |  Yes   |
| Comment on discussions  |   Yes    |        Yes         |  Yes   |
| View club content       |   Yes    |        Yes         |  Yes   |

**Source Files:**

- Role checking: [src/app/actions/clubs/\_helpers.ts](src/app/actions/clubs/_helpers.ts)
- Member management: [src/app/actions/members.ts](src/app/actions/members.ts)
- Membership operations: [src/app/actions/clubs/membership.ts](src/app/actions/clubs/membership.ts)

---

## 4. Festival State Machine

### Phase Diagram

```mermaid
stateDiagram-v2
    [*] --> theme_selection: Create Festival
    [*] --> nomination: Create (themes disabled)

    theme_selection --> nomination: Select Theme
    nomination --> watch_rate: Min 1 nomination
    watch_rate --> results: Min 1 rating
    results --> [*]: Festival Complete

    nomination --> theme_selection: Revert
    watch_rate --> nomination: Revert
    results --> watch_rate: Revert

    state theme_selection {
        [*] --> WaitingForTheme
        WaitingForTheme --> ThemeSelected: Producer selects
        WaitingForTheme --> ThemeSelected: Auto-select (democracy/random)
    }

    state nomination {
        [*] --> AcceptingNominations
        AcceptingNominations --> Ready: nominations >= 1
        AcceptingNominations --> Ready: nominations >= 3 (if guessing)
    }

    state watch_rate {
        [*] --> Watching
        Watching --> Rating
        Rating --> Ready: ratings >= 1
    }

    state results {
        [*] --> Calculating
        Calculating --> Revealed
    }
```

### Phase Details

| Phase             | Status       | Entry Requirements             | Exit Requirements                      | Who Triggers       |
| ----------------- | ------------ | ------------------------------ | -------------------------------------- | ------------------ |
| `theme_selection` | `idle`       | Festival created               | Theme selected                         | Producer, Director |
| `nomination`      | `nominating` | Theme set (or themes disabled) | ≥1 nomination (≥3 if guessing enabled) | Producer, Director |
| `watch_rate`      | `watching`   | Nominations closed             | ≥1 rating submitted                    | Producer, Director |
| `results`         | `completed`  | Ratings closed                 | — (final state)                        | Producer, Director |

### Phase Transition Code

```typescript
// From src/app/actions/festivals.ts:545-613
const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];

// Status mapping
if (nextPhase === "nomination") nextStatus = "nominating";
else if (nextPhase === "watch_rate") nextStatus = "watching";
else if (nextPhase === "results") nextStatus = "completed";
```

### Festival Modes

| Mode       | Description                                  | Theme Handling            | Auto-Advance              |
| ---------- | -------------------------------------------- | ------------------------- | ------------------------- |
| `standard` | Phased competition festivals with scoring    | Full theme selection flow | Optional (deadline-based) |
| `endless`  | Continuous movie pool, any scale, no scoring | Themes optional           | N/A                       |

**Audience profiles:**

- **Standard** targets small-to-mid groups (roughly 5–30 members). Members run themed monthly festivals with rotating nominators so the watch load stays manageable.
- **Endless** targets arbitrarily large communities — creator audiences, movie theaters, and open interest-based communities. No phases, no scoring, no deadlines; members add movies to a shared pool and rate at their own pace.

**Source Files:**

- Phase logic: [src/app/actions/festivals.ts](src/app/actions/festivals.ts)
- Phase UI: [src/components/festivals/AdvancePhaseButton.tsx](src/components/festivals/AdvancePhaseButton.tsx)
- Phase indicator: [src/components/festivals/PhaseIndicator.tsx](src/components/festivals/PhaseIndicator.tsx)

---

## 5. Server Actions Inventory

### Actions by Domain (340+ functions across 142 files)

Server actions are organized into **10 modular subdirectories** plus ~67 root-level files. Each domain barrel-exports via an `index.ts` file; the root `src/app/actions/index.ts` provides namespace imports.

#### Authentication

**Directory:** [src/app/actions/auth/](src/app/actions/auth/) (6 files)

| File          | Key Functions                                       |
| ------------- | --------------------------------------------------- |
| `signin.ts`   | `signIn`, `signInTestUser`, `signInWithMagicLink`   |
| `signup.ts`   | `signUp`                                            |
| `password.ts` | `changePassword`, `resetPassword`, `updatePassword` |
| `account.ts`  | `changeEmail`, `deleteAccount`                      |
| `profile.ts`  | `updateProfile`, `getUserProfile`, `signOut`        |

#### Clubs

**Directory:** [src/app/actions/clubs/](src/app/actions/clubs/) (14 files)

| File               | Key Functions                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `crud.ts`          | `createClub`, `updateClub`, `archiveClub`, `fixClubSlug`                                   |
| `membership.ts`    | `joinClubByCode`, `joinClubByPassword`, `toggleFavoriteClub`, `inviteMemberByEmail`        |
| `announcements.ts` | `createAnnouncement`, `createRichAnnouncement`, `updateAnnouncement`, `deleteAnnouncement` |
| `polls.ts`         | `createPoll`, `voteOnPoll`, `deletePoll`, `getPollsWithVotes`                              |
| `settings.ts`      | `updateClubSettings`, `updateClubMemberPersonalization`, `applyClubPreset`                 |
| `moderation.ts`    | `unblockUser`, `addWordToBlacklist`, `removeWordFromBlacklist`                             |
| `ownership.ts`     | `transferOwnership`, `deleteClub`                                                          |
| `queries.ts`       | `getClubBySlug`, `getClubMembers`, `getClubById`                                           |

#### Festivals & Phases

**Directory:** [src/app/actions/festivals/](src/app/actions/festivals/) (7 files)

| File         | Key Functions                                                        |
| ------------ | -------------------------------------------------------------------- |
| `crud.ts`    | `createFestival`, `getFestivalBySlug`, `cancelFestival`              |
| `phases.ts`  | `advanceFestivalPhase`, `revertFestivalPhase`, `forceAdvance`        |
| `results.ts` | `calculateResults`, `getResults`                                     |
| `updates.ts` | `updateFestivalTheme`, `updateFestivalAppearance`, `updateDeadlines` |
| `admin.ts`   | `getIncompleteParticipants`, `checkAndAdvanceFestivalPhases`         |
| `auto.ts`    | Auto-advance logic for cron jobs                                     |

**Directory:** [src/app/actions/themes/](src/app/actions/themes/) (5 files)

| File           | Key Functions                                  |
| -------------- | ---------------------------------------------- |
| `pool.ts`      | `addTheme`, `removeTheme`, `getTopVotedThemes` |
| `voting.ts`    | `voteForTheme`                                 |
| `selection.ts` | `selectFestivalTheme`, `selectRandomTheme`     |

#### Nominations & Movies (30 functions)

**Files:**

- [src/app/actions/nominations.ts](src/app/actions/nominations.ts)
- [src/app/actions/movies.ts](src/app/actions/movies.ts)

| Function                  | Purpose                      |
| ------------------------- | ---------------------------- |
| `createNomination`        | Nominate a movie             |
| `updateNomination`        | Edit nomination              |
| `deleteNomination`        | Remove nomination            |
| `cacheMovie`              | Store TMDB data              |
| `getMovie`                | Fetch movie                  |
| `markMovieWatched`        | Track watch                  |
| `unmarkMovieWatched`      | Remove watch                 |
| `getWatchedMovies`        | List watched                 |
| `getMovieFestivalHistory` | Movie's festival appearances |

#### Ratings & Rubrics (20 functions)

**Files:**

- [src/app/actions/ratings.ts](src/app/actions/ratings.ts)
- [src/app/actions/rubrics.ts](src/app/actions/rubrics.ts)

| Function              | Purpose                |
| --------------------- | ---------------------- |
| `createRating`        | Submit festival rating |
| `updateGenericRating` | Non-festival rating    |
| `getUserRubrics`      | Get custom rubrics     |
| `createRubric`        | Create rating rubric   |
| `updateRubric`        | Edit rubric            |
| `deleteRubric`        | Remove rubric          |
| `setDefaultRubric`    | Set active rubric      |

#### Discussions

**Directory:** [src/app/actions/discussions/](src/app/actions/discussions/) (9 files)

| File               | Key Functions                                   |
| ------------------ | ----------------------------------------------- |
| `threads.ts`       | `createThread`, `updateThread`, `deleteThread`  |
| `comments.ts`      | `createComment`, `editComment`, `deleteComment` |
| `voting.ts`        | `toggleVote`                                    |
| `tags.ts`          | Tag management for threads                      |
| `auto.ts`          | `autoCreateMovieThread`                         |
| `spoiler-utils.ts` | Spoiler/unlock logic                            |

#### Results & Standings (12 functions)

**Files:**

- [src/app/actions/results.ts](src/app/actions/results.ts)
- [src/app/actions/standings.ts](src/app/actions/standings.ts)
- [src/app/actions/guesses.ts](src/app/actions/guesses.ts)

| Function               | Purpose                   |
| ---------------------- | ------------------------- |
| `calculateResults`     | Compute final results     |
| `getResults`           | Fetch results             |
| `getSeasonStandings`   | Season leaderboard        |
| `getLifetimeStandings` | All-time leaderboard      |
| `saveGuesses`          | Submit nomination guesses |

#### Profile & Preferences

**Directory:** [src/app/actions/profile/](src/app/actions/profile/) (9 files)

| File                    | Key Functions                                            |
| ----------------------- | -------------------------------------------------------- |
| `favorites.ts`          | `updateFavoriteMovie`, `toggleFavoriteMovie`             |
| `preferences.ts`        | `updatePrivacySettings`, `updateNotificationPreferences` |
| `blocking.ts`           | `blockUser`, `reportUser`                                |
| `stats.ts`              | `getUserStats`, `getUserProfileStats`                    |
| `user-stats.ts`         | Aggregate stat calculations                              |
| `past-nominations.ts`   | `getPastNominations`                                     |
| `future-nominations.ts` | `getFutureNominations`                                   |

**Additional files:**

- [src/app/actions/notifications.ts](src/app/actions/notifications.ts) — `getNotifications`, `markAsRead`, `createNotification`
- [src/app/actions/notes.ts](src/app/actions/notes.ts) — `upsertPrivateNote`
- [src/app/actions/navigation-preferences.ts](src/app/actions/navigation-preferences.ts) — Nav customization

#### Members & Events

**Directory:** [src/app/actions/events/](src/app/actions/events/) (6 files)

| File         | Key Functions                               |
| ------------ | ------------------------------------------- |
| `crud.ts`    | `createEvent`, `updateEvent`, `deleteEvent` |
| `queries.ts` | `getClubEvents`, `getUpcomingEvents`        |
| `rsvp.ts`    | `rsvpToEvent`, `getRsvps`                   |

**File:** [src/app/actions/members.ts](src/app/actions/members.ts) — `updateMemberRole`, `removeMember`, `getClubMembers`

#### Endless Festival

**Directory:** [src/app/actions/endless-festival/](src/app/actions/endless-festival/) (11 files)

| File                 | Key Functions                      |
| -------------------- | ---------------------------------- |
| `data.ts`            | `getEndlessFestivalData`           |
| `pool.ts`            | `addMovieToPool`, `removeFromPool` |
| `voting.ts`          | `voteForPoolMovie`                 |
| `watch-history.ts`   | `moveToCompleted`, `markWatched`   |
| `display.ts`         | Display/sort helpers               |
| `member-activity.ts` | Member engagement tracking         |
| `status.ts`          | Pool status computations           |

#### Marketing & Content (19 functions)

**Files:**

- [src/app/actions/marketing.ts](src/app/actions/marketing.ts)
- [src/app/actions/backrow-matinee.ts](src/app/actions/backrow-matinee.ts)

| Function                | Purpose            |
| ----------------------- | ------------------ |
| `getUpcomingMoviesData` | Upcoming releases  |
| `getCurrentMatinee`     | Featured movie     |
| `getFeaturedClub`       | Featured club      |
| `setMovieOfTheWeek`     | Set featured movie |

#### ID Cards & Badges (15+ functions)

**Files:**

- [src/app/actions/id-card.ts](src/app/actions/id-card.ts)
- [src/app/actions/badges.ts](src/app/actions/badges.ts)

| Function               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `updateFeaturedBadges` | Set featured badges on ID card (max 5)   |
| `getUserBadgeData`     | Get all badge progress and earned badges |
| `getUserBadgeStats`    | Get statistics for badge calculations    |
| `checkAndAwardBadges`  | Evaluate and award new badges            |
| `getBadgeProgress`     | Get progress toward next badge           |

**Badge Categories:**

- `festivals_won` - Festival victory achievements (1-100 wins)
- `movies_watched` - Movie watching milestones (1-1000 movies)
- `festivals_participated` - Festival participation (1-1000 festivals)
- `guesses_correct` - Correct nomination guesses (1-1000 guesses)

**Badge Tiers:** Bronze → Silver → Gold → Platinum → Emerald → Diamond → Master → Legend

#### Seasons

**Directory:** [src/app/actions/seasons/](src/app/actions/seasons/) (4 files)

| File             | Key Functions                                 |
| ---------------- | --------------------------------------------- |
| `crud.ts`        | `createSeason`, `updateSeason`                |
| `queries.ts`     | `getSeasonBySlug`, `getSeasonsByClub`         |
| `transitions.ts` | `rolloverSeason`, season lifecycle management |

#### Admin & System

**File:** [src/app/actions/admin.ts](src/app/actions/admin.ts)

| Function                 | Purpose                |
| ------------------------ | ---------------------- |
| `isAdmin`                | Check admin status     |
| `getAdminDashboardData`  | Admin metrics          |
| `setFeaturedClub`        | Feature a club         |
| `createSiteAnnouncement` | Site-wide announcement |

---

## 6. RLS Policies Summary

### Policy Pattern Overview

```mermaid
flowchart TB
    subgraph Read["SELECT Policies"]
        R1["Public content"] --> R1a["Anyone can read"]
        R2["Club content"] --> R2a["Club members only"]
        R3["User content"] --> R3a["Owner only"]
        R4["Hybrid"] --> R4a["Public clubs + members"]
    end

    subgraph Write["INSERT/UPDATE/DELETE Policies"]
        W1["User content"] --> W1a["Owner only"]
        W2["Club admin"] --> W2a["Producer/Director"]
        W3["Membership"] --> W3a["Self-join or producer add"]
    end
```

### Key RLS Policies

#### Clubs Table

```sql
-- SELECT: Public clubs, owners, or members
CREATE POLICY "Users can read clubs"
  FOR SELECT USING (
    privacy LIKE 'public_%'
    OR producer_id = auth.uid()
    OR is_club_member(id, auth.uid())
  );

-- INSERT: Any authenticated user can create
CREATE POLICY "Users can create clubs"
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND producer_id = auth.uid()
  );
```

#### Club Members Table

```sql
-- SELECT: Own membership, public club members, or fellow members
CREATE POLICY "Users can read club members"
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clubs
       WHERE clubs.id = club_members.club_id
       AND clubs.privacy LIKE 'public_%')
    OR is_club_member(club_id, auth.uid())
  );

-- INSERT: Self-join or producer adding
CREATE POLICY "Users can insert club members"
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM clubs
       WHERE clubs.id = club_members.club_id
       AND clubs.producer_id = auth.uid())
  );

-- UPDATE: Producer only
CREATE POLICY "Club producers can update members"
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM clubs
      WHERE clubs.id = club_members.club_id
      AND clubs.producer_id = auth.uid())
  );
```

#### Festivals & Nominations

```sql
-- SELECT: Club members only
CREATE POLICY "Users can read festivals"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = festivals.club_id
      AND club_members.user_id = auth.uid()
    )
  );
```

#### Announcements & Polls

```sql
-- SELECT: Active announcements, club members
CREATE POLICY "Members can view active announcements"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- INSERT: Producer/Director only
CREATE POLICY "Admins can create announcements"
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_announcements.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('producer', 'director'))
    AND user_id = auth.uid()
  );
```

#### Security Definer Function

```sql
-- Avoids RLS recursion when checking membership
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id AND user_id = p_user_id
  );
END;
$$;
```

**Source Files:**

- Core RLS: [supabase/migrations/20241220_fix_club_creation_rls_final.sql](supabase/migrations/20241220_fix_club_creation_rls_final.sql)
- Admin features RLS: [supabase/migrations/20250120000006_add_club_admin_features.sql](supabase/migrations/20250120000006_add_club_admin_features.sql)
- Consolidated policies: [supabase/migrations/20260109000002_consolidate_rls_policies.sql](supabase/migrations/20260109000002_consolidate_rls_policies.sql)

---

## 7. Key Flows

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Actions
    participant S as Supabase Auth
    participant DB as Database

    %% Sign Up Flow
    U->>C: Enter email/password
    C->>A: signUp(email, password)
    A->>S: supabase.auth.signUp()
    S->>DB: Create auth.users record
    S->>U: Send verification email
    A->>DB: Create public.users record
    A-->>C: Return success/redirect

    %% Sign In Flow
    U->>C: Enter credentials
    C->>A: signIn(email, password)
    A->>S: supabase.auth.signInWithPassword()
    S->>S: Validate credentials
    S-->>A: Return session
    A-->>C: Redirect to /home

    %% OAuth Flow
    U->>C: Click OAuth button
    C->>A: signInWithOAuth(provider)
    A->>S: supabase.auth.signInWithOAuth()
    S->>S: Redirect to provider
    S-->>C: Callback with session
    C->>A: Handle callback
    A->>DB: Upsert public.users
```

**Source Files:**

- Auth actions: [src/app/actions/auth/](src/app/actions/auth/) (6 files: `signin.ts`, `signup.ts`, `password.ts`, `account.ts`, `profile.ts`, plus barrel `index.ts`)
- OAuth callback: [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)
- Sign-in form: [src/app/(auth)/sign-in/SignInForm.tsx](<src/app/(auth)/sign-in/SignInForm.tsx>)

### Nomination → Vote → Result Flow

```mermaid
sequenceDiagram
    participant M as Member
    participant C as Client
    participant NA as Nomination Actions
    participant RA as Rating Actions
    participant RS as Results Actions
    participant DB as Database
    participant N as Notifications

    %% Nomination Phase
    rect rgb(200, 230, 200)
        Note over M,N: Phase: Nomination
        M->>C: Search movie
        C->>NA: createNomination(festivalId, tmdbId)
        NA->>DB: Check membership & phase
        NA->>DB: Insert nominations record
        NA->>DB: Cache movie data
        NA->>N: Notify club members
        NA-->>C: Return success
    end

    %% Watch & Rate Phase
    rect rgb(200, 200, 230)
        Note over M,N: Phase: Watch & Rate
        M->>C: Rate movie
        C->>RA: createRating(nominationId, rating)
        RA->>DB: Validate phase is watch_rate
        RA->>DB: Insert/update rating
        RA->>DB: Mark watched in watch_history
        RA->>DB: Log activity
        RA-->>C: Return success
    end

    %% Results Phase
    rect rgb(230, 200, 200)
        Note over M,N: Phase: Results
        M->>C: View results
        C->>RS: calculateResults(festivalId)
        RS->>DB: Fetch all nominations
        RS->>DB: Fetch all ratings
        RS->>RS: Calculate averages
        RS->>RS: Rank movies
        RS->>RS: Calculate standings
        RS->>DB: Insert festival_results
        RS->>DB: Insert festival_standings
        RS->>N: Notify members of results
        RS-->>C: Return results
    end
```

**Source Files:**

- Nominations: [src/app/actions/nominations.ts](src/app/actions/nominations.ts)
- Ratings: [src/app/actions/ratings.ts](src/app/actions/ratings.ts)
- Results: [src/app/actions/results.ts](src/app/actions/results.ts)
- Festival page: [src/app/(dashboard)/club/[slug]/festival/[festival-slug]/page.tsx](<src/app/(dashboard)/club/[slug]/festival/[festival-slug]/page.tsx>)

### Notification Flow

```mermaid
sequenceDiagram
    participant A as Action/Trigger
    participant NS as Notification Service
    participant DB as Database
    participant DL as Delivery Log
    participant U as User

    A->>NS: createNotificationsForUsers(userIds, type, message)
    NS->>NS: Build notification payload

    loop For each user
        NS->>DB: Insert notification record
        DB-->>NS: Notification ID
        NS->>DL: Log delivery attempt

        alt User online
            NS->>U: Real-time push (Supabase Realtime)
        else User offline
            NS->>DB: Store for later
        end
    end

    Note over U: User opens app
    U->>NS: getNotifications()
    NS->>DB: Fetch unread notifications
    DB-->>NS: Notification list
    NS-->>U: Display notifications

    U->>NS: markAsRead(notificationId)
    NS->>DB: Update read=true
```

**Source Files:**

- Notifications: [src/app/actions/notifications.ts](src/app/actions/notifications.ts)
- Notification bell: [src/components/layout/NotificationBell.tsx](src/components/layout/NotificationBell.tsx)
- Activity logger: [src/lib/activity/logger.ts](src/lib/activity/logger.ts)

---

## 8. Design Notes & Potential Issues

### Identified Issues

#### 1. Route Consolidation

**Status:** ✅ Resolved

Admin routes live under `/club/[slug]/manage/*` with role-based UI to differentiate Producer vs Director capabilities. Manage subroutes: `announcements`, `club-management`, `festival`, `homepage-movies`, `season`.

#### 2. Table Count Growth

**Issue:** 65+ tables may indicate over-normalization or feature creep

- Multiple archive tables (activity_log_archive, chat_messages_archive)
- Multiple vote tables (theme_pool_votes, movie_pool_votes, club_poll_votes)
- Potentially redundant: `club_notes` vs `private_notes`

**Note:** The multiple vote tables are intentional - each serves distinct UI components and has different relationships. Not a problem.

**Recommendation:** Monitor for actual redundancy; current structure is acceptable.

#### 3. Missing Database Indexes

**Status:** ✅ Resolved (migration: `20260119000000_architecture_improvements.sql`)

Added indexes for:

- `activity_log.created_at DESC` - feed queries
- `activity_log(club_id, created_at DESC)` - club-specific feeds
- `activity_log(user_id, created_at DESC)` - user-specific feeds
- `discussion_threads(club_id, created_at DESC)` - discussion listing
- `nominations(festival_id, created_at DESC)` - festival nominations
- `ratings(user_id)` - user rating history
- `watch_history(user_id, tmdb_id)` - watch status lookups
- `generic_ratings(user_id)` - user generic ratings

#### 4. JSON Column Usage

**Status:** ✅ Mitigated (migration: `20260119000000_architecture_improvements.sql`)

Added generated columns for frequently-queried settings:

- `clubs.themes_enabled` - extracted from `settings.themes_enabled`
- `clubs.nomination_guessing_enabled` - extracted from `settings.nomination_guessing_enabled`
- `clubs.theme_governance` - extracted from `settings.theme_governance`
- `clubs.max_nominations_per_user` - extracted from `settings.max_nominations_per_user`

These are STORED generated columns that auto-update when settings changes, providing indexed access without schema migration.

#### 5. Soft Delete Inconsistency

**Status:** ✅ Partially Resolved (migration: `20260119000000_architecture_improvements.sql`)

Added `deleted_at` columns to:

- `ratings` - now supports soft delete with audit trail
- `discussion_comments` - now supports soft delete with audit trail

RLS policies updated to filter out deleted records automatically.

**Remaining:** `club_members` uses hard delete (intentional - membership changes tracked via `activity_log`)

#### 6. RLS Policy Performance

**Status:** ✅ Currently well-indexed

Existing indexes handle RLS queries efficiently:

- `idx_club_members_user ON club_members(user_id)`
- `idx_club_members_club_role ON club_members(club_id, role)`
- Unique constraint on `(club_id, user_id)` acts as composite index

**Recommendation:** Monitor via Supabase Performance Advisors. If issues arise at scale, add:

```sql
CREATE INDEX idx_club_members_lookup ON club_members(user_id, club_id);
```

#### 7. Server Action Organization

**Status:** ✅ Resolved

Server actions have been modularized from monolithic files into 10 subdirectories with barrel exports. The root `src/app/actions/index.ts` provides namespace imports:

```typescript
import { auth, clubs, festivals, nominations } from "@/app/actions";

await auth.signIn(email, password);
await clubs.createClub(formData);
await festivals.advanceFestivalPhase(festivalId);
```

**Subdirectories:** `auth/` (6 files), `clubs/` (14 files), `discussions/` (9 files), `endless-festival/` (11 files), `events/` (6 files), `festivals/` (7 files), `members/` (2 files), `profile/` (9 files), `seasons/` (4 files), `themes/` (5 files)

Plus ~67 root-level action files for domains not yet modularized (ratings, rubrics, badges, notifications, etc.).

### Codebase Metrics (April 2026)

| Metric                  | Value     |
| ----------------------- | --------- |
| Server Action Files     | 142 files |
| Server Action Functions | 340+      |
| Database Tables         | 65+       |
| Action Subdirectories   | 10        |
| Route Pages             | 75        |
| API Routes              | 17        |

The previously monolithic action files (`festivals.ts` at 2,224 lines, `discussions.ts` at 1,774 lines, etc.) have been refactored into modular subdirectories. The original files now serve as barrel exports (30-70 lines each).

#### 8. RLS Performance Optimizations (December 2025)

**Status:** ✅ Resolved (migration: `20260125000000_fix_rls_performance_and_security.sql`)

**Issue:** 43 RLS policies using `auth.uid()` directly caused per-row re-evaluation, degrading performance on large tables.

**Fix:** Changed all policies to use `(SELECT auth.uid())` for single evaluation per query.

**Tables Fixed:**

- `club_invite_codes`, `club_join_requests`, `club_resources`
- `discussion_thread_tags`, `festival_rubric_locks`, `movie_pool_votes`
- `private_notes`, `site_admins`, `user_blocks`, `user_reports`, `user_rubrics`

**Additional Fixes:**

- Added 4 missing FK indexes
- Fixed 5 functions with mutable search_path (security)

### Architecture Strengths

1. **Clear Role Hierarchy** - Producer > Director > Critic is well-defined and enforced
2. **Festival State Machine** - Clean phase transitions with validation
3. **RLS Security** - Row-level security on all tables with performance optimizations
4. **Activity Logging** - Comprehensive audit trail
5. **Supabase Integration** - Leverages Supabase features effectively
6. **Next.js 16 Patterns** - Uses server actions, app router correctly

---

_Document generated from codebase analysis. File paths are relative to project root._
