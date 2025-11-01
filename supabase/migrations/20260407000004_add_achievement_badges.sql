-- Add 8 one-off achievement badges (category: "achievements")
-- These are not tiered — each is a single badge you either have or don't.

INSERT INTO badges (name, description, icon_url, badge_type, requirements_jsonb) VALUES
  ('Perfect 10', 'Give a movie a 10.0 rating', NULL, 'site',
   '{"type": "rating_perfect_10", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Tough Crowd', 'Give a movie a 0.0 rating', NULL, 'site',
   '{"type": "rating_rock_bottom", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Contrarian', 'Rate a movie 3+ points below the group average', NULL, 'site',
   '{"type": "rating_contrarian", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Generous', 'Rate a movie 3+ points above the group average', NULL, 'site',
   '{"type": "rating_generous", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Crowd Pleaser', 'Your nomination gets the highest rating in a festival', NULL, 'site',
   '{"type": "nomination_crowd_pleaser", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Photo Finish', 'Win a festival by less than 0.5 points', NULL, 'site',
   '{"type": "festival_photo_finish", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Back to Back', 'Win 2 consecutive festivals in the same club', NULL, 'site',
   '{"type": "festival_back_to_back", "threshold": 1, "category": "achievements"}'::jsonb),
  ('Club Founder', 'Create your first club', NULL, 'site',
   '{"type": "club_founder", "threshold": 1, "category": "achievements"}'::jsonb)
ON CONFLICT DO NOTHING;
