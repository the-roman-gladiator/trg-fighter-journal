-- Fix infinite recursion between profiles and fighter_profiles RLS policies
-- The issue: policies on profiles query fighter_profiles, and policies on
-- fighter_profiles query profiles, creating mutual recursion.
-- Solution: replace inline EXISTS subqueries with SECURITY DEFINER functions
-- that bypass RLS.

-- 1. Helper: does the given user have a fighter_profile row?
CREATE OR REPLACE FUNCTION public.user_has_fighter_profile(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fighter_profiles WHERE user_id = _user_id
  )
$$;

-- 2. Drop and recreate the recursive policy on profiles
DROP POLICY IF EXISTS "Head coaches can view fighter applicant profiles" ON public.profiles;

CREATE POLICY "Head coaches can view fighter applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_head_coach(auth.uid())
  AND public.user_has_fighter_profile(profiles.id)
);

-- 3. Drop and recreate the recursive policies on fighter_profiles
DROP POLICY IF EXISTS "Head coaches can view all fighter profiles" ON public.fighter_profiles;
DROP POLICY IF EXISTS "Head coaches can update all fighter profiles" ON public.fighter_profiles;

CREATE POLICY "Head coaches can view all fighter profiles"
ON public.fighter_profiles
FOR SELECT
TO authenticated
USING (public.is_head_coach(auth.uid()));

CREATE POLICY "Head coaches can update all fighter profiles"
ON public.fighter_profiles
FOR UPDATE
TO authenticated
USING (public.is_head_coach(auth.uid()));