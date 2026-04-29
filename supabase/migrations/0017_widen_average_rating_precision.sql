-- Widen festival_standings.average_rating from numeric(3,1) to numeric(4,2).
--
-- The 1-decimal scale was dropping real precision: a movie with avg rating
-- 7.78 would store as 7.80 and surface in the UI with a misleading trailing
-- zero. The averages-of-averages math always produces 2-decimal values, so
-- 2 is the natural display + storage precision.

ALTER TABLE public.festival_standings
  ALTER COLUMN average_rating TYPE numeric(4,2);
