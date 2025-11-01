-- Migration: Add database comments for documentation
-- Applied: 2025-06-03
-- This helps developers understand the schema when exploring the database

-- Core tables
COMMENT ON TABLE public.users IS 'User profiles linked to auth.users, contains display name, avatar, and preferences';
COMMENT ON TABLE public.clubs IS 'Movie clubs where members watch and rate films together. Can be public or private.';
COMMENT ON TABLE public.club_members IS 'Club membership records with roles (producer, director, critic)';
COMMENT ON TABLE public.seasons IS 'Competitive seasons within a club for tracking points and rankings';
COMMENT ON TABLE public.festivals IS 'Movie festivals (themed events) within a club. Can be competitive or endless.';
COMMENT ON TABLE public.nominations IS 'Movie nominations for festivals. In endless mode, tracks pool/playing/completed status.';
COMMENT ON TABLE public.movies IS 'Cached movie data from TMDB API to reduce API calls';
COMMENT ON TABLE public.ratings IS 'User ratings for movies within festival context';
COMMENT ON TABLE public.generic_ratings IS 'User ratings for movies outside of festival context';

-- Discussion tables
COMMENT ON TABLE public.discussion_threads IS 'Discussion threads for clubs, movies, or festivals. Can be auto-created or user-created.';
COMMENT ON TABLE public.discussion_comments IS 'Comments on discussion threads with support for nested replies (max 3 levels)';
COMMENT ON TABLE public.discussion_votes IS 'Upvotes on threads and comments';
COMMENT ON TABLE public.discussion_thread_unlocks IS 'Tracks which users have unlocked spoiler-protected movie threads';

-- Club feature tables
COMMENT ON TABLE public.club_announcements IS 'Admin announcements pinned to club pages';
COMMENT ON TABLE public.club_events IS 'Scheduled watch parties and events within clubs';
COMMENT ON TABLE public.club_event_rsvps IS 'RSVP responses for club events';
COMMENT ON TABLE public.club_polls IS 'Polls for club decisions (date selection, movie voting, etc.)';
COMMENT ON TABLE public.club_poll_votes IS 'Votes cast on club polls';
COMMENT ON TABLE public.theme_pool IS 'Pool of suggested themes for future festivals';
COMMENT ON TABLE public.theme_pool_votes IS 'Votes on theme pool suggestions';
COMMENT ON TABLE public.theme_votes IS 'Votes on active festival theme options';

-- User feature tables
COMMENT ON TABLE public.notifications IS 'User notifications with support for archiving and read status';
COMMENT ON TABLE public.favorite_clubs IS 'User favorite clubs for quick access in sidebar';
COMMENT ON TABLE public.future_nomination_list IS 'User watchlist for movies to nominate in future festivals';
COMMENT ON TABLE public.watch_history IS 'User movie watch history across all clubs';
COMMENT ON TABLE public.private_notes IS 'Personal notes users can add to any movie';
COMMENT ON TABLE public.club_notes IS 'Shared notes visible to club members for movies';

-- Results and standings
COMMENT ON TABLE public.festival_results IS 'CACHED results for completed festivals - JSONB containing points, never recalculate';
COMMENT ON TABLE public.festival_standings IS 'User standings/rankings within a festival';
COMMENT ON TABLE public.stack_rankings IS 'User movie stack rankings for tiebreaker scoring';

-- Analytics tables
COMMENT ON TABLE public.search_analytics IS 'Tracks search queries for improving search - auto-pruned after 90 days';
COMMENT ON TABLE public.filter_analytics IS 'Tracks filter usage for UX improvements - auto-pruned after 90 days';
COMMENT ON TABLE public.activity_log IS 'Club activity log for displaying recent actions in feeds';

-- Messaging
COMMENT ON TABLE public.chat_messages IS 'Real-time club chat messages';
COMMENT ON TABLE public.direct_messages IS 'Private messages between club members';

-- Admin tables
COMMENT ON TABLE public.site_admins IS 'Site-wide administrators with super_admin role for elevated permissions';
COMMENT ON TABLE public.site_settings IS 'Global site configuration settings';
COMMENT ON TABLE public.site_announcements IS 'Site-wide announcements shown to all users';

-- Badge system
COMMENT ON TABLE public.badges IS 'Available badges that can be earned by users';
COMMENT ON TABLE public.user_badges IS 'Badges earned by users';

-- Other tables
COMMENT ON TABLE public.persons IS 'Cached person data from TMDB (actors, directors)';
COMMENT ON TABLE public.blocked_users IS 'Club-level user blocks';
COMMENT ON TABLE public.club_word_blacklist IS 'Banned words for club content moderation';
COMMENT ON TABLE public.subscriptions IS 'User subscription status for premium features';
COMMENT ON TABLE public.backrow_matinee IS 'Special BackRow Matinee club weekly movie picks';

-- Key column comments
COMMENT ON COLUMN public.clubs.settings IS 'JSONB containing club preferences: festival_mode, theme_pool_enabled, auto_create_threads, etc.';
COMMENT ON COLUMN public.clubs.slug IS 'URL-friendly unique identifier for the club';
COMMENT ON COLUMN public.festivals.phase IS 'Current festival phase: setup, nominating, voting, watch_rate, results';
COMMENT ON COLUMN public.festivals.status IS 'Festival status: draft, nominating, voting, watching, rating, completed';
COMMENT ON COLUMN public.nominations.endless_status IS 'For endless festivals: pool (nominated), playing (current), completed (watched)';
COMMENT ON COLUMN public.nominations.display_slot IS 'Homepage display designation: featured or throwback';
COMMENT ON COLUMN public.festival_results.results IS 'CACHED JSONB results - never recalculate, always use this value';
COMMENT ON COLUMN public.club_members.role IS 'Member role: producer (owner), director (admin), critic (member)';

