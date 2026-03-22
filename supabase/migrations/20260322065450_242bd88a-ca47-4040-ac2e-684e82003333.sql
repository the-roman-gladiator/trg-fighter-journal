
-- Profile extensions for strength training
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS discipline text DEFAULT 'MMA',
  ADD COLUMN IF NOT EXISTS strength_level text DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS strength_program_start_date date,
  ADD COLUMN IF NOT EXISTS coach_override_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_by_coach boolean DEFAULT false;

-- Workout templates extensions
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS duration_weeks integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS progression_weeks_1_4 text DEFAULT 'Learn technique and base volume',
  ADD COLUMN IF NOT EXISTS progression_weeks_5_8 text DEFAULT 'Increase load and intensity',
  ADD COLUMN IF NOT EXISTS progression_weeks_9_12 text DEFAULT 'Peak performance, speed, and power',
  ADD COLUMN IF NOT EXISTS system_rule text,
  ADD COLUMN IF NOT EXISTS override_rule text,
  ADD COLUMN IF NOT EXISTS coach_override_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Workout template exercises extensions
ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS default_duration text,
  ADD COLUMN IF NOT EXISTS default_distance text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS default_rounds integer;

-- User roles table
CREATE TYPE public.app_role AS ENUM ('athlete', 'coach', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Workout logs table
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_template_id uuid REFERENCES public.workout_templates(id),
  discipline text,
  level text,
  week_number integer,
  status text NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  overall_notes text,
  completion_percentage numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workout logs" ON public.workout_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_workout_logs_updated_at
  BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workout log exercises table
CREATE TABLE public.workout_log_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_order integer NOT NULL DEFAULT 0,
  set_number integer NOT NULL DEFAULT 1,
  target_reps integer,
  completed_reps integer,
  target_weight numeric,
  used_weight numeric,
  target_duration text,
  completed_duration text,
  target_distance text,
  completed_distance text,
  is_completed boolean DEFAULT false,
  is_skipped boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_log_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own log exercises" ON public.workout_log_exercises
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.workout_logs WHERE id = workout_log_exercises.workout_log_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_logs WHERE id = workout_log_exercises.workout_log_id AND user_id = auth.uid()));

-- Allow viewing system templates (seeded workout templates)
CREATE POLICY "View system templates" ON public.workout_templates
  FOR SELECT TO authenticated USING (source_type = 'system');

-- Update handle_new_user to also assign athlete role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Fighter'),
    NEW.email,
    'Beginner'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'athlete');
  RETURN NEW;
END;
$$;
