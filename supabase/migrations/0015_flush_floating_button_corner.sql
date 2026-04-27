-- Migration: 0015_flush_floating_button_corner
-- Date: 2026-04-27
--
-- Backfills the legacy `floatingButtonCorner` JSONB field on users into the
-- current `menuPosition` field, then removes the legacy key. The legacy field
-- was a 4-way enum (top-left, top-right, bottom-left, bottom-right); the
-- current model uses a 2-way left/right `menuPosition` since the floating
-- button was simplified to a side-anchored position.
--
-- Verified pre-migration: zero rows had the legacy key on 2026-04-27. The
-- migration is therefore a no-op against current production data, but the
-- helper code in `src/app/actions/navigation-preferences.ts` that translated
-- the legacy field is being removed in the same change. This migration locks
-- the schema invariant.

UPDATE users
SET mobile_nav_preferences =
  (mobile_nav_preferences - 'floatingButtonCorner')
  || jsonb_build_object('menuPosition',
       CASE
         WHEN mobile_nav_preferences->>'floatingButtonCorner' IN ('top-left', 'bottom-left')
           THEN 'left'
         WHEN mobile_nav_preferences->>'floatingButtonCorner' IN ('top-right', 'bottom-right')
           THEN 'right'
         ELSE COALESCE(mobile_nav_preferences->>'menuPosition', 'right')
       END)
WHERE mobile_nav_preferences ? 'floatingButtonCorner';
