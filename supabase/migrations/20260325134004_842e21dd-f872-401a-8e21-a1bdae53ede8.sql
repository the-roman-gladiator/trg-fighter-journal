
-- Coach sessions table for coaches to plan classes/drills for students
CREATE TABLE public.coach_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  discipline text NOT NULL,
  session_plan text,
  drills text,
  target_level text,
  target_students text,
  duration_minutes integer,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own sessions
CREATE POLICY "Coaches can insert own sessions" ON public.coach_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can view own sessions" ON public.coach_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coaches can update own sessions" ON public.coach_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coaches can delete own sessions" ON public.coach_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Head coaches can view all coach sessions
CREATE POLICY "Head coaches can view all coach sessions" ON public.coach_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.coach_level = 'head_coach'
  ));

-- Add updated_at trigger
CREATE TRIGGER update_coach_sessions_updated_at
  BEFORE UPDATE ON public.coach_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
