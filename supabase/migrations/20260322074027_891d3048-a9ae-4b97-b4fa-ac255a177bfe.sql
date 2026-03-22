
-- Workout Plans (pathway definitions)
CREATE TABLE public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discipline text NOT NULL,
  level text NOT NULL,
  duration_weeks integer NOT NULL DEFAULT 12,
  sessions_per_week integer NOT NULL DEFAULT 3,
  description text,
  progression_weeks_1_4 text DEFAULT 'Learn technique and base volume',
  progression_weeks_5_8 text DEFAULT 'Increase load and intensity',
  progression_weeks_9_12 text DEFAULT 'Peak performance, speed, and power',
  auto_progression_enabled boolean DEFAULT false,
  coach_override_allowed boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workout Plan Weeks
CREATE TABLE public.workout_plan_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  phase_label text NOT NULL,
  weekly_goal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workout_plan_id, week_number)
);

-- Workout Plan Sessions (which template for which week/session)
CREATE TABLE public.workout_plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  session_number integer NOT NULL,
  workout_template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  session_label text,
  is_required boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workout_plan_id, week_number, session_number)
);

-- Athlete Plan Assignments
CREATE TABLE public.athlete_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  current_week integer NOT NULL DEFAULT 1,
  current_session_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  completed_sessions_count integer NOT NULL DEFAULT 0,
  completion_percentage numeric DEFAULT 0,
  assigned_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Athlete Plan Session Progress
CREATE TABLE public.athlete_plan_session_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_plan_assignment_id uuid NOT NULL REFERENCES public.athlete_plan_assignments(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  session_number integer NOT NULL,
  workout_template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  workout_log_id uuid REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'locked',
  scheduled_date date,
  started_at timestamptz,
  completed_at timestamptz,
  completion_percentage numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_plan_assignment_id, week_number, session_number)
);

-- Enable RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_plan_session_progress ENABLE ROW LEVEL SECURITY;

-- Workout plans: anyone authenticated can read active plans
CREATE POLICY "Anyone can view active plans" ON public.workout_plans FOR SELECT TO authenticated USING (is_active = true);

-- Workout plan weeks: anyone authenticated can read
CREATE POLICY "Anyone can view plan weeks" ON public.workout_plan_weeks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_plans WHERE id = workout_plan_weeks.workout_plan_id AND is_active = true)
);

-- Workout plan sessions: anyone authenticated can read
CREATE POLICY "Anyone can view plan sessions" ON public.workout_plan_sessions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workout_plans WHERE id = workout_plan_sessions.workout_plan_id AND is_active = true)
);

-- Athlete plan assignments: users manage own
CREATE POLICY "Users manage own plan assignments" ON public.athlete_plan_assignments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Athlete plan session progress: users manage own
CREATE POLICY "Users manage own session progress" ON public.athlete_plan_session_progress FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.athlete_plan_assignments WHERE id = athlete_plan_session_progress.athlete_plan_assignment_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.athlete_plan_assignments WHERE id = athlete_plan_session_progress.athlete_plan_assignment_id AND user_id = auth.uid()
  ));

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_plan_session_progress;
