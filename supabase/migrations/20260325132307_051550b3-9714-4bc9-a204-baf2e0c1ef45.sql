
-- Fighter profiles table
CREATE TABLE public.fighter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  fighter_status text NOT NULL DEFAULT 'pending' CHECK (fighter_status IN ('pending', 'approved', 'rejected')),
  requested_fight_disciplines text[] NOT NULL DEFAULT '{}',
  approved_fight_disciplines text[] NOT NULL DEFAULT '{}',
  discipline_approved_by uuid,
  discipline_approved_at timestamptz,
  approved_by_head_coach uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fighter_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own fighter profile
CREATE POLICY "Users can view own fighter profile" ON public.fighter_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert their own fighter profile (request)
CREATE POLICY "Users can insert own fighter profile" ON public.fighter_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can update own fighter profile (limited - only requested disciplines)
CREATE POLICY "Users can update own fighter profile" ON public.fighter_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Head coaches can view all fighter profiles
CREATE POLICY "Head coaches can view all fighter profiles" ON public.fighter_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND coach_level = 'head_coach'
    )
  );

-- Head coaches can update all fighter profiles (approve/reject)
CREATE POLICY "Head coaches can update all fighter profiles" ON public.fighter_profiles
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND coach_level = 'head_coach'
    )
  );

-- Fighter sessions table
CREATE TABLE public.fighter_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  discipline text NOT NULL,
  opponent_scenario text,
  strategy text,
  tactic text,
  action text,
  goal text,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fighter_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fighter sessions" ON public.fighter_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fighter sessions" ON public.fighter_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own fighter sessions" ON public.fighter_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own fighter sessions" ON public.fighter_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Head coaches can view all fighter sessions
CREATE POLICY "Head coaches can view all fighter sessions" ON public.fighter_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND coach_level = 'head_coach'
    )
  );

-- Head coaches can update fighter sessions (approve)
CREATE POLICY "Head coaches can update fighter sessions" ON public.fighter_sessions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND coach_level = 'head_coach'
    )
  );

-- Updated_at trigger for both tables
CREATE TRIGGER update_fighter_profiles_updated_at
  BEFORE UPDATE ON public.fighter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fighter_sessions_updated_at
  BEFORE UPDATE ON public.fighter_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
