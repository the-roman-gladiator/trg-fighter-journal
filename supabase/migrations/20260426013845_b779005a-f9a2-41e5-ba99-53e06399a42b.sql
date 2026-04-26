
-- Head coaches can view profiles of any user who has a fighter_profile (pending, approved, or rejected)
CREATE POLICY "Head coaches can view fighter applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.coach_level = 'head_coach'::public.coach_level
  )
  AND EXISTS (
    SELECT 1 FROM public.fighter_profiles fp
    WHERE fp.user_id = profiles.id
  )
);
