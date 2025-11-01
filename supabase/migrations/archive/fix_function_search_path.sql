-- Fix function search_path warnings
-- Set search_path for validate_festival_dates function
ALTER FUNCTION public.validate_festival_dates() SET search_path = '';

-- Set search_path for update_updated_at function  
ALTER FUNCTION public.update_updated_at() SET search_path = '';

