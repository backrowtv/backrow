-- Add slug column to discussion_threads table for SEO-friendly URLs
-- Follows the same pattern as clubs, festivals, seasons, and movies

-- Add slug column
ALTER TABLE discussion_threads
ADD COLUMN slug TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN discussion_threads.slug IS 'URL-friendly slug generated from thread title, unique per club';

-- Create unique constraint per club (null slugs are allowed for backward compatibility during migration)
CREATE UNIQUE INDEX idx_discussion_threads_club_slug 
ON discussion_threads(club_id, slug) 
WHERE slug IS NOT NULL;

-- Create index for fast slug lookups
CREATE INDEX idx_discussion_threads_slug_lookup 
ON discussion_threads(club_id, slug);

-- Backfill slugs for existing threads
-- Generate slug from title: lowercase, replace non-alphanumeric with hyphens, trim hyphens
-- Handle duplicates within same club by appending numeric suffix
DO $$
DECLARE
    thread_record RECORD;
    base_slug TEXT;
    final_slug TEXT;
    suffix INT;
    slug_exists BOOLEAN;
BEGIN
    FOR thread_record IN 
        SELECT id, club_id, title 
        FROM discussion_threads 
        WHERE slug IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Generate base slug from title (max 50 chars before suffix)
        base_slug := LEFT(
            TRIM(BOTH '-' FROM 
                REGEXP_REPLACE(
                    LOWER(thread_record.title), 
                    '[^a-z0-9]+', 
                    '-', 
                    'g'
                )
            ),
            50
        );
        
        -- Handle empty slugs (if title was all special characters)
        IF base_slug = '' OR base_slug IS NULL THEN
            base_slug := 'thread-' || LEFT(thread_record.id::TEXT, 8);
        END IF;
        
        -- Check for uniqueness and add suffix if needed
        final_slug := base_slug;
        suffix := 1;
        
        LOOP
            SELECT EXISTS(
                SELECT 1 FROM discussion_threads 
                WHERE club_id = thread_record.club_id 
                AND slug = final_slug 
                AND id != thread_record.id
            ) INTO slug_exists;
            
            EXIT WHEN NOT slug_exists;
            
            suffix := suffix + 1;
            final_slug := base_slug || '-' || suffix;
        END LOOP;
        
        -- Update the thread with the generated slug
        UPDATE discussion_threads 
        SET slug = final_slug 
        WHERE id = thread_record.id;
    END LOOP;
END $$;

