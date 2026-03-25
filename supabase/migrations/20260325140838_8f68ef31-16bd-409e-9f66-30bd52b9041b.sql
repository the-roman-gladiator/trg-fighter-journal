
-- Add coach_session_id to training_sessions to link athlete logs to coach classes
ALTER TABLE public.training_sessions 
ADD COLUMN coach_session_id uuid REFERENCES public.coach_sessions(id) ON DELETE SET NULL;

-- Allow athletes to also see completed coach sessions (they already can see scheduled ones)
CREATE POLICY "Athletes can view completed coach sessions"
ON public.coach_sessions
FOR SELECT
TO authenticated
USING (status = 'completed');
