-- Allow students to view coach_sessions they have been offered (any status),
-- so the dashboard inbox can render the note title, discipline, tactic, etc.
CREATE POLICY "Students view coach sessions offered to them"
ON public.coach_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_note_offers o
    WHERE o.coach_session_id = coach_sessions.id
      AND o.student_id = auth.uid()
  )
);