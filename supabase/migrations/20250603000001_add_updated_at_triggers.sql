-- Migration: Add missing updated_at triggers
-- These 8 tables have updated_at columns but no auto-update trigger
-- Applied: 2025-06-03

-- Create a reusable trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 1. user_stats
DROP TRIGGER IF EXISTS set_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER set_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. club_stats
DROP TRIGGER IF EXISTS set_club_stats_updated_at ON public.club_stats;
CREATE TRIGGER set_club_stats_updated_at
  BEFORE UPDATE ON public.club_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. discussion_threads
DROP TRIGGER IF EXISTS set_discussion_threads_updated_at ON public.discussion_threads;
CREATE TRIGGER set_discussion_threads_updated_at
  BEFORE UPDATE ON public.discussion_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. discussion_comments
DROP TRIGGER IF EXISTS set_discussion_comments_updated_at ON public.discussion_comments;
CREATE TRIGGER set_discussion_comments_updated_at
  BEFORE UPDATE ON public.discussion_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. club_events
DROP TRIGGER IF EXISTS set_club_events_updated_at ON public.club_events;
CREATE TRIGGER set_club_events_updated_at
  BEFORE UPDATE ON public.club_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. club_event_rsvps
DROP TRIGGER IF EXISTS set_club_event_rsvps_updated_at ON public.club_event_rsvps;
CREATE TRIGGER set_club_event_rsvps_updated_at
  BEFORE UPDATE ON public.club_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. site_settings
DROP TRIGGER IF EXISTS set_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. site_announcements
DROP TRIGGER IF EXISTS set_site_announcements_updated_at ON public.site_announcements;
CREATE TRIGGER set_site_announcements_updated_at
  BEFORE UPDATE ON public.site_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

