-- Add MPAA certification column to movies table
-- This stores the content rating (G, PG, PG-13, R, NC-17, etc.)

ALTER TABLE movies
ADD COLUMN IF NOT EXISTS certification TEXT;

-- Add comment for documentation
COMMENT ON COLUMN movies.certification IS 'MPAA content rating (e.g., G, PG, PG-13, R, NC-17)';
