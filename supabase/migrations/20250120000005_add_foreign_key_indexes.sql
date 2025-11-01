-- ============================================
-- ADD FOREIGN KEY INDEXES
-- ============================================
-- Purpose: Add indexes for all unindexed foreign keys to improve query performance
-- Date: 2025-01-20
-- 
-- This migration addresses Performance Advisor Info suggestions by:
-- Adding indexes on all foreign key columns that don't already have covering indexes
-- ============================================

BEGIN;

-- ============================================
-- Fix duplicate index on theme_pool.club_id
-- ============================================
-- Drop the duplicate index if it exists (created manually in browser)
-- The existing idx_theme_pool_club from previous migration already covers club_id

DROP INDEX IF EXISTS public.idx_theme_pool_club_id;

-- ============================================
-- blocked_users table
-- ============================================
-- Foreign keys: blocked_by, club_id, user_id
-- Note: club_id and user_id are part of composite PK, but blocked_by needs index

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_by ON public.blocked_users(blocked_by);
CREATE INDEX IF NOT EXISTS idx_blocked_users_club_id ON public.blocked_users(club_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON public.blocked_users(user_id);

-- ============================================
-- chat_messages table
-- ============================================
-- Foreign keys: club_id, user_id

CREATE INDEX IF NOT EXISTS idx_chat_messages_club_id ON public.chat_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- ============================================
-- club_notes table
-- ============================================
-- Foreign keys: club_id, tmdb_id, user_id

CREATE INDEX IF NOT EXISTS idx_club_notes_club_id ON public.club_notes(club_id);
CREATE INDEX IF NOT EXISTS idx_club_notes_tmdb_id ON public.club_notes(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_club_notes_user_id ON public.club_notes(user_id);

-- ============================================
-- clubs table
-- ============================================
-- Foreign keys: producer_id

CREATE INDEX IF NOT EXISTS idx_clubs_producer_id ON public.clubs(producer_id);

-- ============================================
-- email_digest_log table
-- ============================================
-- Foreign keys: user_id

CREATE INDEX IF NOT EXISTS idx_email_digest_log_user_id ON public.email_digest_log(user_id);

-- ============================================
-- generic_ratings table
-- ============================================
-- Foreign keys: tmdb_id, user_id
-- Note: user_id and tmdb_id are part of composite PK, but still good to have explicit indexes

CREATE INDEX IF NOT EXISTS idx_generic_ratings_tmdb_id ON public.generic_ratings(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_generic_ratings_user_id ON public.generic_ratings(user_id);

-- ============================================
-- nomination_guesses table
-- ============================================
-- Foreign keys: festival_id, user_id

CREATE INDEX IF NOT EXISTS idx_nomination_guesses_festival_id ON public.nomination_guesses(festival_id);
CREATE INDEX IF NOT EXISTS idx_nomination_guesses_user_id ON public.nomination_guesses(user_id);

-- ============================================
-- notification_dead_letter_queue table
-- ============================================
-- Foreign keys: notification_id

CREATE INDEX IF NOT EXISTS idx_notification_dead_letter_queue_notification_id ON public.notification_dead_letter_queue(notification_id);

-- ============================================
-- notification_delivery_log table
-- ============================================
-- Foreign keys: notification_id

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON public.notification_delivery_log(notification_id);

-- ============================================
-- notifications table
-- ============================================
-- Foreign keys: user_id

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ============================================
-- private_notes table
-- ============================================
-- Foreign keys: tmdb_id, user_id
-- Note: user_id and tmdb_id are part of composite PK, but still good to have explicit indexes

CREATE INDEX IF NOT EXISTS idx_private_notes_tmdb_id ON public.private_notes(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_private_notes_user_id ON public.private_notes(user_id);

-- ============================================
-- recommendation_list table
-- ============================================
-- Foreign keys: tmdb_id, user_id
-- Note: user_id and tmdb_id are part of composite PK, but still good to have explicit indexes

CREATE INDEX IF NOT EXISTS idx_recommendation_list_tmdb_id ON public.recommendation_list(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_list_user_id ON public.recommendation_list(user_id);

-- ============================================
-- stack_rankings table
-- ============================================
-- Foreign keys: festival_id, user_id

CREATE INDEX IF NOT EXISTS idx_stack_rankings_festival_id ON public.stack_rankings(festival_id);
CREATE INDEX IF NOT EXISTS idx_stack_rankings_user_id ON public.stack_rankings(user_id);

-- ============================================
-- theme_pool table
-- ============================================
-- Foreign keys: added_by, club_id
-- Note: club_id already has index idx_theme_pool_club from previous migration, only added_by needs index

CREATE INDEX IF NOT EXISTS idx_theme_pool_added_by ON public.theme_pool(added_by);

-- ============================================
-- watch_history table
-- ============================================
-- Foreign keys: tmdb_id, user_id

CREATE INDEX IF NOT EXISTS idx_watch_history_tmdb_id ON public.watch_history(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);

COMMIT;

