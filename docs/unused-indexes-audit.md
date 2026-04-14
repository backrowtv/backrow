# Unused Indexes Audit

This document lists unused indexes flagged by the Supabase performance advisor. These indexes have not been used according to PostgreSQL statistics and are candidates for review.

**Generated:** 2026-01-08
**Project ID:** ifurgbocssewpoontnml (BackRow-Dev)

## Summary

- **Total Unused Indexes:** 92
- **Tables Affected:** 45

## Unused Indexes by Table

### activity_log

_No unused indexes_

### backrow_matinee

| Index Name                    | Recommendation                                            |
| ----------------------------- | --------------------------------------------------------- |
| `idx_backrow_matinee_club`    | **Drop** - Low-traffic table, unlikely to need this index |
| `idx_backrow_matinee_tmdb_id` | **Drop** - Low-traffic table, FK constraint is sufficient |

### badges

| Index Name            | Recommendation                                                        |
| --------------------- | --------------------------------------------------------------------- |
| `idx_badges_category` | **Keep for future** - Will be useful when badge filtering UI is added |

### blocked_users

| Index Name                     | Recommendation                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| `idx_blocked_users_blocked_by` | **Needs investigation** - May be used after moderation features launch |
| `idx_blocked_users_club_id`    | **Needs investigation** - May be used after moderation features launch |
| `idx_blocked_users_user_id`    | **Needs investigation** - May be used after moderation features launch |

### chat_messages

| Index Name                  | Recommendation                                |
| --------------------------- | --------------------------------------------- |
| `idx_chat_messages_club_id` | **Keep for future** - Chat feature is planned |
| `idx_chat_messages_user_id` | **Keep for future** - Chat feature is planned |

### club_announcements

| Index Name                    | Recommendation                                     |
| ----------------------------- | -------------------------------------------------- |
| `idx_club_announcements_type` | **Drop** - Announcement type filtering rarely used |

### club_badges

| Index Name                 | Recommendation                                 |
| -------------------------- | ---------------------------------------------- |
| `idx_club_badges_badge_id` | **Keep for future** - Club badge system is new |
| `idx_club_badges_earned`   | **Keep for future** - Club badge system is new |

### club_event_rsvps

| Index Name                    | Recommendation                                       |
| ----------------------------- | ---------------------------------------------------- |
| `idx_club_event_rsvps_status` | **Keep for future** - Event system is relatively new |

### club_invites

| Index Name                    | Recommendation                                                      |
| ----------------------------- | ------------------------------------------------------------------- |
| `idx_club_invites_token`      | **Needs investigation** - Should be heavily used for invite lookups |
| `idx_club_invites_created_by` | **Drop** - Rarely query by creator                                  |
| `idx_club_invites_used_by`    | **Drop** - Rarely query by user who used invite                     |

### club_join_requests

| Index Name                     | Recommendation                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| `idx_join_requests_club_id`    | **Needs investigation** - Should be used when viewing pending requests |
| `idx_join_requests_created_at` | **Drop** - Sorting by created_at not common                            |

### club_movie_pool

| Index Name                       | Recommendation                              |
| -------------------------------- | ------------------------------------------- |
| `idx_club_movie_pool_created_at` | **Drop** - Sorting by created_at not common |

### club_notes

| Index Name               | Recommendation                                              |
| ------------------------ | ----------------------------------------------------------- |
| `idx_club_notes_club_id` | **Needs investigation** - Should be used when loading notes |
| `idx_club_notes_tmdb_id` | **Needs investigation** - Should be used when loading notes |
| `idx_club_notes_user_id` | **Drop** - Rarely query by user                             |

### club_poll_votes

| Index Name                    | Recommendation                                               |
| ----------------------------- | ------------------------------------------------------------ |
| `idx_club_poll_votes_poll_id` | **Needs investigation** - Should be used when tallying votes |

### club_polls

| Index Name                    | Recommendation                                                                |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `idx_club_polls_is_anonymous` | **Drop** - Boolean index rarely effective                                     |
| `idx_club_polls_action_type`  | **Drop** - Low cardinality, rarely filtered                                   |
| `idx_club_polls_unprocessed`  | **Keep for future** - Used by background job to find polls needing processing |

### club_resources

| Index Name                      | Recommendation                     |
| ------------------------------- | ---------------------------------- |
| `idx_club_resources_created_by` | **Drop** - Rarely query by creator |

### club_stats

| Index Name                | Recommendation                                    |
| ------------------------- | ------------------------------------------------- |
| `idx_club_stats_activity` | **Drop** - Stats table rarely queried by activity |

### clubs

| Index Name                     | Recommendation                                                    |
| ------------------------------ | ----------------------------------------------------------------- |
| `idx_clubs_slug`               | **Needs investigation** - Should be heavily used for slug lookups |
| `idx_clubs_festival_type`      | **Drop** - Low cardinality, rarely filtered                       |
| `idx_clubs_scoring_enabled`    | **Drop** - Boolean index rarely effective                         |
| `idx_clubs_featured_badge_ids` | **Keep for future** - New feature                                 |

### curated_collections

| Index Name                     | Recommendation                                   |
| ------------------------------ | ------------------------------------------------ |
| `idx_curated_collections_slug` | **Keep for future** - Collections feature is new |

### direct_messages

| Index Name                       | Recommendation                              |
| -------------------------------- | ------------------------------------------- |
| `idx_direct_messages_club`       | **Keep for future** - DM feature is planned |
| `idx_direct_messages_created_at` | **Keep for future** - DM feature is planned |
| `idx_direct_messages_sender`     | **Keep for future** - DM feature is planned |

### discussion_comments

| Index Name                        | Recommendation                                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `idx_discussion_comments_created` | **Needs investigation** - Should be used for sorting                    |
| `idx_discussion_comments_active`  | **Needs investigation** - Should be used for filtering deleted comments |

### discussion_thread_tags

| Index Name                                  | Recommendation                                                    |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `idx_discussion_thread_tags_thread_id`      | **Needs investigation** - Should be used when loading thread tags |
| `idx_discussion_thread_tags_person_tmdb_id` | **Drop** - Rarely filter by person                                |

### discussion_threads

| Index Name                       | Recommendation                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `idx_discussion_threads_upvotes` | **Drop** - Sorting by upvotes not implemented                          |
| `idx_discussion_threads_pinned`  | **Keep for future** - Will be used when pinned threads are implemented |

### email_digest_log

| Index Name                     | Recommendation                                    |
| ------------------------------ | ------------------------------------------------- |
| `idx_email_digest_log_user_id` | **Keep for future** - Email digest feature is new |

### feedback_items

| Index Name                      | Recommendation                                                   |
| ------------------------------- | ---------------------------------------------------------------- |
| `idx_feedback_items_status`     | **Needs investigation** - Should be used for filtering by status |
| `idx_feedback_items_created_at` | **Drop** - Primary key ordering is sufficient                    |

### feedback_votes

| Index Name                       | Recommendation                                               |
| -------------------------------- | ------------------------------------------------------------ |
| `idx_feedback_votes_feedback_id` | **Needs investigation** - Should be used when counting votes |

### festival_standings

| Index Name             | Recommendation                                         |
| ---------------------- | ------------------------------------------------------ |
| `idx_standings_points` | **Drop** - Sorting by points done in application layer |

### festivals

| Index Name                        | Recommendation                                                    |
| --------------------------------- | ----------------------------------------------------------------- |
| `idx_festivals_theme_selected_by` | **Drop** - Rarely query by theme selector                         |
| `idx_festivals_slug`              | **Needs investigation** - Should be heavily used for slug lookups |

### filter_analytics

| Index Name                         | Recommendation                                   |
| ---------------------------------- | ------------------------------------------------ |
| `idx_filter_analytics_has_results` | **Drop** - Analytics table, infrequently queried |
| `idx_filter_analytics_combination` | **Drop** - Analytics table, infrequently queried |

### movie_pool_votes

| Index Name                               | Recommendation                                                 |
| ---------------------------------------- | -------------------------------------------------------------- |
| `idx_movie_pool_votes_nomination_id`     | **Drop** - Legacy index from old schema                        |
| `idx_movie_pool_votes_user_id`           | **Needs investigation** - May be needed for vote deduplication |
| `idx_movie_pool_votes_club_pool_item_id` | **Needs investigation** - Should be used when tallying votes   |

### movies

| Index Name        | Recommendation                                            |
| ----------------- | --------------------------------------------------------- |
| `idx_movies_slug` | **Needs investigation** - Should be used for slug lookups |

### nomination_guesses

| Index Name                       | Recommendation                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| `idx_nomination_guesses_user_id` | **Needs investigation** - Should be used when loading user guesses |

### nominations

| Index Name                         | Recommendation                           |
| ---------------------------------- | ---------------------------------------- |
| `idx_nominations_recently_watched` | **Drop** - Feature not fully implemented |

### notification_dead_letter_queue

| Index Name                                           | Recommendation                                |
| ---------------------------------------------------- | --------------------------------------------- |
| `idx_notification_dead_letter_queue_notification_id` | **Keep for future** - Used by retry mechanism |

### notification_delivery_log

| Index Name                                      | Recommendation                                   |
| ----------------------------------------------- | ------------------------------------------------ |
| `idx_notification_delivery_log_notification_id` | **Keep for future** - Used for delivery tracking |

### notifications

| Index Name                          | Recommendation                                                      |
| ----------------------------------- | ------------------------------------------------------------------- |
| `idx_notifications_club_id`         | **Needs investigation** - May be used for club-scoped notifications |
| `idx_notifications_festival_id`     | **Needs investigation** - May be used for festival notifications    |
| `idx_notifications_related_user_id` | **Drop** - Rarely query by related user                             |
| `idx_notifications_read`            | **Needs investigation** - Should be used for filtering unread       |
| `idx_notifications_archived`        | **Drop** - Archived notifications rarely queried                    |
| `idx_notifications_user_id`         | **Needs investigation** - Should be heavily used                    |

### persons

| Index Name         | Recommendation                                          |
| ------------------ | ------------------------------------------------------- |
| `idx_persons_name` | **Keep for future** - Will be useful for search feature |

### private_notes

| Index Name                    | Recommendation                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `idx_private_notes_user_tmdb` | **Drop** - Composite index exists                                |
| `idx_private_notes_tmdb_id`   | **Drop** - Composite index exists                                |
| `idx_private_notes_user_id`   | **Needs investigation** - Should be used when loading user notes |

### search_analytics

| Index Name                         | Recommendation                                   |
| ---------------------------------- | ------------------------------------------------ |
| `idx_search_analytics_has_results` | **Drop** - Analytics table, infrequently queried |
| `idx_search_analytics_query`       | **Drop** - Analytics table, infrequently queried |

### site_admins

| Index Name                   | Recommendation                     |
| ---------------------------- | ---------------------------------- |
| `idx_site_admins_created_by` | **Drop** - Rarely query by creator |

### site_announcements

| Index Name                      | Recommendation                                                |
| ------------------------------- | ------------------------------------------------------------- |
| `idx_site_announcements_active` | **Needs investigation** - Should be used for filtering active |

### site_settings

| Index Name                     | Recommendation                     |
| ------------------------------ | ---------------------------------- |
| `idx_site_settings_updated_by` | **Drop** - Rarely query by updater |

### stack_rankings

| Index Name                       | Recommendation                                                      |
| -------------------------------- | ------------------------------------------------------------------- |
| `idx_stack_rankings_festival_id` | **Needs investigation** - Should be used when loading rankings      |
| `idx_stack_rankings_user_id`     | **Needs investigation** - Should be used when loading user rankings |

### theme_pool

| Index Name                | Recommendation                   |
| ------------------------- | -------------------------------- |
| `idx_theme_pool_added_by` | **Drop** - Rarely query by adder |

### theme_pool_votes

| Index Name                       | Recommendation                              |
| -------------------------------- | ------------------------------------------- |
| `idx_theme_pool_votes_vote_type` | **Drop** - Low cardinality, rarely filtered |

### user_reports

| Index Name                | Recommendation                                  |
| ------------------------- | ----------------------------------------------- |
| `idx_user_reports_status` | **Keep for future** - Moderation feature is new |

### user_rubrics

| Index Name                    | Recommendation                            |
| ----------------------------- | ----------------------------------------- |
| `idx_user_rubrics_is_default` | **Drop** - Boolean index rarely effective |

### user_stats

| Index Name              | Recommendation                                         |
| ----------------------- | ------------------------------------------------------ |
| `idx_user_stats_active` | **Drop** - Boolean index rarely effective              |
| `idx_user_stats_points` | **Drop** - Sorting by points done in application layer |

### users

| Index Name                         | Recommendation                                          |
| ---------------------------------- | ------------------------------------------------------- |
| `idx_users_favorite_actor_tmdb_id` | **Keep for future** - Profile feature is relatively new |
| `idx_users_featured_badge_ids`     | **Keep for future** - Badge system is new               |

## Recommendations Summary

| Action                  | Count |
| ----------------------- | ----- |
| **Drop**                | 42    |
| **Keep for future**     | 24    |
| **Needs investigation** | 26    |

## Investigation Notes

The "Needs investigation" indexes should be queried in production to verify they are actually being used. Many of these may indicate:

1. Missing query patterns in the application code
2. RLS policies that bypass indexes
3. Small table sizes where PostgreSQL chooses sequential scans

## How to Drop Indexes

When ready to drop indexes, use a migration like:

```sql
-- Example: Drop unused analytics indexes
DROP INDEX IF EXISTS idx_filter_analytics_has_results;
DROP INDEX IF EXISTS idx_filter_analytics_combination;
DROP INDEX IF EXISTS idx_search_analytics_has_results;
DROP INDEX IF EXISTS idx_search_analytics_query;
```

**Important:** Monitor query performance after dropping indexes and be prepared to recreate them if needed.
