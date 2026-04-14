# Privacy and data lifecycle

Authoritative reference for how BackRow stores, exports, and deletes user data.

The user-facing copy is in `src/app/(marketing)/privacy-policy/page.tsx`. That
page must stay aligned with the implementation described here — if one of
these contracts changes, both files change in the same PR.

---

## Retention windows

| Data                                        | Retained for                                        |
| ------------------------------------------- | --------------------------------------------------- |
| Account profile (public.users + auth.users) | Indefinitely while account is active                |
| User-authored content (ratings, noms, etc.) | Indefinitely while account is active                |
| Signed export archives (account-exports)    | 7 days from generation, then swept by weekly cron   |
| `job_dedup` rows                            | 7 days                                              |
| Archived notifications                      | 30 days (see `cleanup-archived-notifications` cron) |
| Soft-deleted accounts (`users.deleted_at`)  | 30 days until hard-delete queue job fires           |

---

## Data export

### Trigger

Authenticated user clicks **Email me my data** in profile settings.
`POST /api/account/export` → `enqueueAccountExport(userId)`.

### Worker

`src/lib/jobs/handlers/account-export.ts`:

1. `claimJob()` for idempotency across retries.
2. Fetch user's own rows from every table in `OWNED_TABLES` + discussion
   threads the user authored + their own discussion comments (scrubbed).
3. Build a ZIP with JSZip, one JSON file per table.
4. Upload to private `account-exports` bucket at `${userId}/${timestamp}-export.zip`.
5. Generate a 7-day signed URL via `supabase.storage.createSignedUrl`.
6. Email the URL to the user via Resend.

### Scrub rules

- `discussion_comments` include only rows where `author_id = userId`. The
  selected columns are `id, thread_id, parent_comment_id, body, created_at,
updated_at` — sibling comments and thread author metadata are excluded.
- `discussion_threads` include only rows the user authored (full row).
- No other user's email, display name, bio, or avatar appears in the export.

### Format

See the generated `README.md` at the root of every archive for the canonical
file list. Format is JSON (one file per table), UTF-8, pretty-printed.

---

## Account deletion

### Trigger

Authenticated user types `DELETE` and clicks **Delete Account**.
`POST /api/account/delete`.

### Phase 1 — soft-delete (synchronous)

1. Block if `SELECT count FROM clubs WHERE producer_id = user.id > 0`. The
   user must transfer or archive each club first.
2. `UPDATE public.users` to set `deleted_at = now()` and anonymize `email`,
   `username`, `display_name`, `avatar_url`, `bio`, `social_links`. The row
   persists; the auth row persists.
3. `supabase.auth.signOut()`.
4. `enqueueAccountHardDelete(userId, { delaySeconds: 30 * 86400 })`.

### Phase 2 — sign-in block (middleware)

`src/lib/supabase/middleware.ts` queries `public.users.deleted_at` on every
request for signed-in users. If set, the session is terminated and the
browser is redirected to `/?deleted=1` — the landing page banner explains the
30-day grace window and surfaces the support email for restoration.

### Phase 3 — hard-delete (30 days later, queue worker)

`src/lib/jobs/handlers/account-hard-delete.ts`:

1. Re-verify `deleted_at` is still set. If the user was reactivated (by
   support, clearing `deleted_at`), the handler returns cleanly.
2. Re-verify the user is not the sole `producer_id` of any active club. If
   they are, clear `deleted_at` and email them to transfer ownership.
3. `supabase.auth.admin.deleteUser(userId)`. Cascade FKs (see below) remove
   every owned row; SET NULL FKs leave audit rows anonymized.
4. Delete every object in `account-exports/${userId}/`.

### Restoring an account during grace

Support manually clears `deleted_at` on the users row (and reverses the
anonymization of email/display_name/username if the user provides the old
values). The scheduled hard-delete job then returns no-op when it fires.

---

## Cascade decisions

This table is the source of truth for every FK that references the user
identity (`public.users.id` or `auth.users.id`). **Adding a new
user-referencing FK requires adding a row here in the same PR.**

Legend:

- `CASCADE` — row is user-owned; deletion removes it.
- `SET NULL` — row persists for audit / shared history; user reference is cleared.
- `RESTRICT` — deletion is blocked by the DB; business layer enforces the pre-condition.

| Source table                | Column              | Referenced       | On delete  | Rationale                                                                                                       |
| --------------------------- | ------------------- | ---------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `public.users`              | `id`                | `auth.users(id)` | `CASCADE`  | Profile mirror; auth deletion cleans PII mirror automatically.                                                  |
| `activity_log`              | `user_id`           | `users(id)`      | `SET NULL` | Audit log; event retained, attribution cleared.                                                                 |
| `blocked_users`             | `user_id`           | `users(id)`      | `CASCADE`  | Block record is owned by the user.                                                                              |
| `blocked_users`             | `blocked_by`        | `users(id)`      | `SET NULL` | Blocker is a reference; block persists after blocker leaves.                                                    |
| `chat_messages`             | `user_id`           | `users(id)`      | `SET NULL` | Message history retained; author anonymized.                                                                    |
| `club_announcements`        | `user_id`           | `users(id)`      | `CASCADE`  | Owned by the author.                                                                                            |
| `club_event_rsvps`          | `user_id`           | `users(id)`      | `CASCADE`  | Owned by the attendee.                                                                                          |
| `club_events`               | `created_by`        | `users(id)`      | `SET NULL` | Event persists after creator leaves.                                                                            |
| `club_invites`              | `created_by`        | `users(id)`      | `SET NULL` | Invite persists; creator is historical reference.                                                               |
| `club_invites`              | `used_by`           | `users(id)`      | `SET NULL` | Who accepted is historical reference.                                                                           |
| `club_join_requests`        | `user_id`           | `users(id)`      | `CASCADE`  | Owned by the requester.                                                                                         |
| `club_join_requests`        | `reviewed_by`       | `users(id)`      | `SET NULL` | Moderator reference.                                                                                            |
| `club_members`              | `user_id`           | `users(id)`      | `CASCADE`  | Membership is user-owned.                                                                                       |
| `club_movie_pool`           | `user_id`           | `users(id)`      | `CASCADE`  | Suggestion attributed to suggester.                                                                             |
| `club_notes`                | `user_id`           | `users(id)`      | `SET NULL` | Shared club note; attribution cleared on delete.                                                                |
| `club_poll_votes`           | `user_id`           | `users(id)`      | `CASCADE`  | Vote is user-owned.                                                                                             |
| `club_polls`                | `user_id`           | `users(id)`      | `CASCADE`  | Poll is user-owned.                                                                                             |
| `club_resources`            | `created_by`        | `users(id)`      | `SET NULL` | Resource persists after poster leaves.                                                                          |
| `club_word_blacklist`       | `added_by`          | `users(id)`      | `CASCADE`  | Moderation entry tied to the moderator.                                                                         |
| `clubs`                     | `producer_id`       | `users(id)`      | `RESTRICT` | Sole-producer deletion destroys other members' data — blocked in both the API route and the hard-delete worker. |
| `direct_messages`           | `sender_id`         | `users(id)`      | `CASCADE`  | User-owned content.                                                                                             |
| `direct_messages`           | `recipient_id`      | `users(id)`      | `CASCADE`  | User-owned content (recipient).                                                                                 |
| `discussion_comments`       | `author_id`         | `users(id)`      | `SET NULL` | Thread integrity preserved; author anonymized.                                                                  |
| `discussion_thread_unlocks` | `user_id`           | `users(id)`      | `CASCADE`  | Unlock is per-user.                                                                                             |
| `discussion_threads`        | `author_id`         | `users(id)`      | `SET NULL` | Thread persists for other commenters; author anonymized.                                                        |
| `discussion_votes`          | `user_id`           | `users(id)`      | `CASCADE`  | Vote is user-owned.                                                                                             |
| `email_digest_log`          | `user_id`           | `users(id)`      | `CASCADE`  | Per-user send log.                                                                                              |
| `favorite_clubs`            | `user_id`           | `users(id)`      | `CASCADE`  | Bookmark is user-owned.                                                                                         |
| `feedback_items`            | `user_id`           | `users(id)`      | `SET NULL` | Feedback persists for product review; author anonymized.                                                        |
| `feedback_votes`            | `user_id`           | `users(id)`      | `SET NULL` | Vote retained for tallying; user anonymized.                                                                    |
| `festival_rubric_locks`     | `user_id`           | `users(id)`      | `CASCADE`  | Per-user lock.                                                                                                  |
| `festival_standings`        | `user_id`           | `users(id)`      | `CASCADE`  | Cached standing.                                                                                                |
| `festivals`                 | `theme_selected_by` | `auth.users(id)` | `SET NULL` | Voting attribution; festival row persists.                                                                      |
| `filter_analytics`          | `user_id`           | `users(id)`      | `SET NULL` | Telemetry; anonymized.                                                                                          |
| `future_nomination_list`    | `user_id`           | `auth.users(id)` | `CASCADE`  | Personal list.                                                                                                  |
| `generic_ratings`           | `user_id`           | `users(id)`      | `CASCADE`  | Rating is user-owned.                                                                                           |
| `hidden_activities`         | `user_id`           | `auth.users(id)` | `CASCADE`  | Per-user hide.                                                                                                  |
| `hidden_watch_history`      | `user_id`           | `auth.users(id)` | `CASCADE`  | Per-user hide.                                                                                                  |
| `movie_pool_votes`          | `user_id`           | `auth.users(id)` | `CASCADE`  | Vote is user-owned.                                                                                             |
| `nomination_guesses`        | `user_id`           | `users(id)`      | `CASCADE`  | Guess is user-owned.                                                                                            |
| `nominations`               | `user_id`           | `users(id)`      | `SET NULL` | Festival history retained; nominator anonymized.                                                                |
| `notifications`             | `user_id`           | `users(id)`      | `CASCADE`  | Notification is for the user.                                                                                   |
| `notifications`             | `related_user_id`   | `users(id)`      | `CASCADE`  | Reference to other actor; cascade on either end is fine.                                                        |
| `private_notes`             | `user_id`           | `users(id)`      | `CASCADE`  | Private to the user.                                                                                            |
| `push_subscriptions`        | `user_id`           | `users(id)`      | `CASCADE`  | Device token registered by user.                                                                                |
| `ratings`                   | `user_id`           | `users(id)`      | `SET NULL` | Festival history retained; rater anonymized.                                                                    |
| `search_analytics`          | `user_id`           | `users(id)`      | `SET NULL` | Telemetry; anonymized.                                                                                          |
| `site_admins`               | `user_id`           | `users(id)`      | `CASCADE`  | Admin role removed with user.                                                                                   |
| `site_admins`               | `created_by`        | `users(id)`      | `SET NULL` | Audit trail.                                                                                                    |
| `site_announcements`        | `created_by`        | `users(id)`      | `SET NULL` | Post persists for all users.                                                                                    |
| `site_settings`             | `updated_by`        | `users(id)`      | `SET NULL` | Audit trail.                                                                                                    |
| `stack_rankings`            | `user_id`           | `users(id)`      | `SET NULL` | Leaderboard history retained.                                                                                   |
| `subscriptions`             | `user_id`           | `users(id)`      | `CASCADE`  | Billing link is per-user.                                                                                       |
| `theme_pool`                | `added_by`          | `users(id)`      | `SET NULL` | Theme persists; contributor anonymized.                                                                         |
| `theme_pool_votes`          | `user_id`           | `users(id)`      | `SET NULL` | Vote tally retained.                                                                                            |
| `theme_votes`               | `user_id`           | `users(id)`      | `CASCADE`  | Vote is user-owned.                                                                                             |
| `user_badges`               | `user_id`           | `users(id)`      | `CASCADE`  | Per-user badge.                                                                                                 |
| `user_blocks`               | `blocker_id`        | `users(id)`      | `CASCADE`  | User-owned mute.                                                                                                |
| `user_blocks`               | `blocked_id`        | `users(id)`      | `CASCADE`  | Targets cleared on either side.                                                                                 |
| `user_favorites`            | `user_id`           | `auth.users(id)` | `CASCADE`  | Personal favorite.                                                                                              |
| `user_reports`              | `reporter_id`       | `users(id)`      | `CASCADE`  | Report filed by user.                                                                                           |
| `user_reports`              | `reported_id`       | `users(id)`      | `CASCADE`  | Target user; cleanup on either side.                                                                            |
| `user_reports`              | `reviewed_by`       | `users(id)`      | `SET NULL` | Moderator reference.                                                                                            |
| `user_rubrics`              | `user_id`           | `users(id)`      | `CASCADE`  | Per-user rubric.                                                                                                |
| `user_stats`                | `user_id`           | `users(id)`      | `CASCADE`  | Cached stats.                                                                                                   |
| `watch_history`             | `user_id`           | `users(id)`      | `CASCADE`  | Private watch history.                                                                                          |

---

## Cookie consent

Component: `src/components/compliance/CookieConsent.tsx` (pre-existing).

Behavior:

- Client-only, writes to `localStorage` under key `backrow-cookie-consent`.
- Dispatches `window.dispatchEvent(new CustomEvent("cookie-consent-updated"))`
  so downstream analytics hooks can react.
- Banner distinguishes "essential" (always on) from "analytics" (opt-in).

Mounted in `src/app/layout.tsx` immediately after the WCAG skip-to-main link
so screen-reader users encounter it before the page chrome. No server-side
persistence; if users clear localStorage the banner reappears — acceptable
for our current analytics posture.

---

## Operational notes

- Migration `0004_cascade_delete_audit.sql` is the baseline for all cascade
  decisions above. Any change to FK on-delete behavior after that migration
  is additive and must update this table in the same PR.
- The `account-exports` bucket has a 100 MB file size limit and accepts
  `application/zip` only. RLS: service role full access; users can SELECT
  objects only when `(storage.foldername(name))[1] = auth.uid()::text`.
- The weekly orphan-sweep cron at `/api/cron/orphan-sweep` deletes expired
  export archives (older than 7 days).
