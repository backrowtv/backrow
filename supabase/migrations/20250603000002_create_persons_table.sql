-- Create persons table for caching TMDB person data
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  birthday DATE,
  deathday DATE,
  place_of_birth TEXT,
  profile_url TEXT,
  known_for_department TEXT,
  biography TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_persons_tmdb_id ON persons(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_persons_slug ON persons(slug);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);

-- Enable RLS
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

-- RLS Policies - persons are public read
CREATE POLICY "Anyone can view persons"
  ON persons
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update (for caching)
CREATE POLICY "Authenticated users can insert persons"
  ON persons
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update persons"
  ON persons
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

