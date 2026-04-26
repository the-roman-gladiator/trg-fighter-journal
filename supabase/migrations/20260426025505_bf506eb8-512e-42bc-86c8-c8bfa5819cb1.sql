
-- 1. Head coaches & admins can DELETE any fighter profile
CREATE POLICY "Head coaches can delete fighter profiles"
ON public.fighter_profiles
FOR DELETE
TO authenticated
USING (public.is_head_coach(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Head coaches & admins can INSERT a fighter profile for any user
--    (Existing INSERT policy only allows users to insert their own — this adds head coach manual add)
CREATE POLICY "Head coaches can insert any fighter profile"
ON public.fighter_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_head_coach(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Head coaches & admins can UPDATE non-coach (or any) profile to demote/remove them
--    (Existing "Head coaches can update nominated coach profiles" already covers coach demotion)
--    No new policy needed — clearing coach_level is an UPDATE that current policy already allows.
