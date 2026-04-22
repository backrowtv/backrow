-- Drop users.date_of_birth column.
--
-- Signup now collects a 16+ self-attestation checkbox instead of a literal
-- date of birth, so the column (and its age CHECK) are obsolete. Verified
-- zero non-null values at migration time.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_age_13_plus;
ALTER TABLE public.users DROP COLUMN IF EXISTS date_of_birth;
