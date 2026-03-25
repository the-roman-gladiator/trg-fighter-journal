
-- Allow all authenticated users to view scheduled/published coach sessions
CREATE POLICY "Athletes can view scheduled coach sessions"
ON public.coach_sessions
FOR SELECT
TO authenticated
USING (status = 'scheduled');
