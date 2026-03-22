
-- Add new values to discipline enum
ALTER TYPE public.discipline ADD VALUE IF NOT EXISTS 'Strength Training';
ALTER TYPE public.discipline ADD VALUE IF NOT EXISTS 'Cardio Activity';

-- Add workout_mode enum
CREATE TYPE public.workout_mode AS ENUM ('manual', 'template', 'qr');

-- Add cardio_type enum  
CREATE TYPE public.cardio_type AS ENUM ('Running', 'Walking', 'Bike', 'Rowing', 'AssaultBike', 'Swimming', 'StairClimber', 'Hiking', 'JumpRope', 'Other');

-- Add new columns to training_sessions for strength training
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS workout_mode public.workout_mode,
  ADD COLUMN IF NOT EXISTS workout_template_id uuid,
  ADD COLUMN IF NOT EXISTS workout_name text,
  ADD COLUMN IF NOT EXISTS workout_type text,
  ADD COLUMN IF NOT EXISTS total_load numeric,
  ADD COLUMN IF NOT EXISTS total_reps integer,
  ADD COLUMN IF NOT EXISTS total_sets integer,
  ADD COLUMN IF NOT EXISTS total_exercises integer;

-- Add new columns to training_sessions for cardio
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS cardio_activity_name text,
  ADD COLUMN IF NOT EXISTS cardio_type public.cardio_type,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS distance_meters numeric,
  ADD COLUMN IF NOT EXISTS calories integer,
  ADD COLUMN IF NOT EXISTS avg_pace_seconds_per_km numeric,
  ADD COLUMN IF NOT EXISTS avg_heart_rate integer,
  ADD COLUMN IF NOT EXISTS max_heart_rate integer;

-- Create exercise_library table
CREATE TABLE public.exercise_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  muscle_group text,
  equipment text,
  is_custom boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-custom exercises" ON public.exercise_library
  FOR SELECT TO authenticated
  USING (is_custom = false OR user_id = auth.uid());

CREATE POLICY "Users can insert custom exercises" ON public.exercise_library
  FOR INSERT TO authenticated
  WITH CHECK (is_custom = true AND user_id = auth.uid());

CREATE POLICY "Users can update their custom exercises" ON public.exercise_library
  FOR UPDATE TO authenticated
  USING (is_custom = true AND user_id = auth.uid());

CREATE POLICY "Users can delete their custom exercises" ON public.exercise_library
  FOR DELETE TO authenticated
  USING (is_custom = true AND user_id = auth.uid());

-- Create workout_templates table
CREATE TABLE public.workout_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  workout_type text,
  description text,
  source_type text NOT NULL DEFAULT 'manual',
  qr_code_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" ON public.workout_templates
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own templates" ON public.workout_templates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own templates" ON public.workout_templates
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own templates" ON public.workout_templates
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create workout_template_exercises table
CREATE TABLE public.workout_template_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_library_id uuid REFERENCES public.exercise_library(id),
  exercise_order integer NOT NULL DEFAULT 0,
  default_sets integer NOT NULL DEFAULT 3,
  default_reps integer NOT NULL DEFAULT 10,
  default_weight numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template exercises" ON public.workout_template_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = workout_template_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert template exercises" ON public.workout_template_exercises
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = workout_template_id AND user_id = auth.uid()));
CREATE POLICY "Users can update template exercises" ON public.workout_template_exercises
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = workout_template_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete template exercises" ON public.workout_template_exercises
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = workout_template_id AND user_id = auth.uid()));

-- Create strength_workout_exercises table
CREATE TABLE public.strength_workout_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_library_id uuid REFERENCES public.exercise_library(id),
  template_exercise_id uuid REFERENCES public.workout_template_exercises(id),
  exercise_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strength_workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workout exercises" ON public.strength_workout_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = training_session_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their workout exercises" ON public.strength_workout_exercises
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = training_session_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their workout exercises" ON public.strength_workout_exercises
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = training_session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their workout exercises" ON public.strength_workout_exercises
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = training_session_id AND user_id = auth.uid()));

-- Create strength_workout_sets table
CREATE TABLE public.strength_workout_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strength_workout_exercise_id uuid NOT NULL REFERENCES public.strength_workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL DEFAULT 1,
  reps integer,
  weight numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strength_workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workout sets" ON public.strength_workout_sets
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strength_workout_exercises swe
    JOIN public.training_sessions ts ON ts.id = swe.training_session_id
    WHERE swe.id = strength_workout_exercise_id AND ts.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their workout sets" ON public.strength_workout_sets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.strength_workout_exercises swe
    JOIN public.training_sessions ts ON ts.id = swe.training_session_id
    WHERE swe.id = strength_workout_exercise_id AND ts.user_id = auth.uid()
  ));
CREATE POLICY "Users can update their workout sets" ON public.strength_workout_sets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strength_workout_exercises swe
    JOIN public.training_sessions ts ON ts.id = swe.training_session_id
    WHERE swe.id = strength_workout_exercise_id AND ts.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete their workout sets" ON public.strength_workout_sets
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.strength_workout_exercises swe
    JOIN public.training_sessions ts ON ts.id = swe.training_session_id
    WHERE swe.id = strength_workout_exercise_id AND ts.user_id = auth.uid()
  ));

-- Add updated_at triggers
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from training_sessions to workout_templates
ALTER TABLE public.training_sessions
  ADD CONSTRAINT training_sessions_workout_template_id_fkey
  FOREIGN KEY (workout_template_id) REFERENCES public.workout_templates(id);
