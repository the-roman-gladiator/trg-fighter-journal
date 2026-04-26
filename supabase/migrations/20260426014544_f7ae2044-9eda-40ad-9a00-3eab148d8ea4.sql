-- Drop the recursive policy that's blocking all profile reads
DROP POLICY IF EXISTS "Head coaches can view fighter applicant profiles" ON public.profiles;

-- Create a SECURITY DEFINER helper function that bypasses RLS
-- This avoids the infinite recursion when checking coach_level inside a profiles policy
CREATE OR REPLACE FUNCTION public.is_head_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND coach_level = 'head_coach'::public.coach_level
  )
$$;

-- Recreate the policy using the helper function (no recursion)
CREATE POLICY "Head coaches can view fighter applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_head_coach(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.user_id = profiles.id
  )
);