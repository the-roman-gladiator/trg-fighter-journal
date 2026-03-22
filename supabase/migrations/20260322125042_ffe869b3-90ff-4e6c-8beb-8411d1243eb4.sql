
-- User assessments table
CREATE TABLE public.user_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discipline TEXT NOT NULL,
  height_cm NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  age INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  body_fat_percent NUMERIC,
  pushups_max INTEGER NOT NULL DEFAULT 0,
  situps_max INTEGER NOT NULL DEFAULT 0,
  squats_max INTEGER NOT NULL DEFAULT 0,
  plank_seconds INTEGER,
  walking_hr_recovery INTEGER,
  notes TEXT,
  coach_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Body composition classifications table
CREATE TABLE public.body_composition_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.user_assessments(id) ON DELETE CASCADE,
  bmi_value NUMERIC NOT NULL,
  bmi_class TEXT NOT NULL,
  bodyfat_class TEXT,
  performance_class TEXT NOT NULL,
  final_class TEXT NOT NULL,
  override_by_coach BOOLEAN DEFAULT false,
  override_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assigned programs table
CREATE TABLE public.assigned_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.user_assessments(id) ON DELETE SET NULL,
  classification_result TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  phase_week_start INTEGER NOT NULL DEFAULT 1,
  phase_week_end INTEGER NOT NULL DEFAULT 4,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reassessment_date DATE,
  coach_override BOOLEAN DEFAULT false,
  coach_override_reason TEXT,
  active BOOLEAN DEFAULT true,
  martial_arts_sessions_per_week INTEGER NOT NULL DEFAULT 0,
  cardio_sessions_per_week INTEGER NOT NULL DEFAULT 0,
  strength_sessions_per_week INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assigned program sessions table
CREATE TABLE public.assigned_program_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_program_id UUID NOT NULL REFERENCES public.assigned_programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('martial_arts', 'cardio', 'strength')),
  workout_template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  scheduled_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'in_progress', 'completed', 'skipped')),
  coach_signed_off BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_composition_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assigned_program_sessions ENABLE ROW LEVEL SECURITY;

-- user_assessments policies
CREATE POLICY "Users can view own assessments" ON public.user_assessments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own assessments" ON public.user_assessments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own assessments" ON public.user_assessments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- body_composition_classifications policies
CREATE POLICY "Users can view own classifications" ON public.body_composition_classifications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_assessments WHERE user_assessments.id = body_composition_classifications.assessment_id AND user_assessments.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own classifications" ON public.body_composition_classifications
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_assessments WHERE user_assessments.id = body_composition_classifications.assessment_id AND user_assessments.user_id = auth.uid())
  );
CREATE POLICY "Users can update own classifications" ON public.body_composition_classifications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_assessments WHERE user_assessments.id = body_composition_classifications.assessment_id AND user_assessments.user_id = auth.uid())
  );

-- assigned_programs policies
CREATE POLICY "Users can view own programs" ON public.assigned_programs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own programs" ON public.assigned_programs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own programs" ON public.assigned_programs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- assigned_program_sessions policies
CREATE POLICY "Users manage own program sessions" ON public.assigned_program_sessions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.assigned_programs WHERE assigned_programs.id = assigned_program_sessions.assigned_program_id AND assigned_programs.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.assigned_programs WHERE assigned_programs.id = assigned_program_sessions.assigned_program_id AND assigned_programs.user_id = auth.uid())
  );

-- Updated_at triggers
CREATE TRIGGER update_user_assessments_updated_at BEFORE UPDATE ON public.user_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_body_composition_classifications_updated_at BEFORE UPDATE ON public.body_composition_classifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assigned_programs_updated_at BEFORE UPDATE ON public.assigned_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assigned_program_sessions_updated_at BEFORE UPDATE ON public.assigned_program_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
