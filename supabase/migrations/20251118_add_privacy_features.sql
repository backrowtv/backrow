-- Add allow_public_profile column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS allow_public_profile boolean DEFAULT false;

-- Create function to check mutual club membership
CREATE OR REPLACE FUNCTION public.have_mutual_clubs(user_a_id uuid, user_b_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_mutual boolean;
BEGIN
  -- If users are the same, return true
  IF user_a_id = user_b_id THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.club_members cm1
    JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = user_a_id
    AND cm2.user_id = user_b_id
  ) INTO has_mutual;
  
  RETURN has_mutual;
END;
$$;

