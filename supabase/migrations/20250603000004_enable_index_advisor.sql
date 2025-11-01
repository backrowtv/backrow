-- Migration: Enable index_advisor for automatic index recommendations
-- Applied: 2025-06-03
-- This helps identify missing indexes based on actual query patterns

-- Install required dependency first
CREATE EXTENSION IF NOT EXISTS hypopg;

-- Now enable index_advisor
CREATE EXTENSION IF NOT EXISTS index_advisor;

-- Usage examples:
-- 
-- 1. Get index suggestions for a specific query:
--    SELECT * FROM index_advisor('SELECT * FROM clubs WHERE slug = $1');
--
-- 2. Analyze a complex query:
--    SELECT * FROM index_advisor('
--      SELECT n.*, m.title 
--      FROM nominations n 
--      JOIN movies m ON m.tmdb_id = n.tmdb_id 
--      WHERE n.festival_id = $1
--    ');
--
-- 3. The function returns suggested indexes with estimated improvement

