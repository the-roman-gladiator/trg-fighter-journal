-- Add admin-override SELECT policies so the developer/admin account can view all user data.
-- Uses the existing security-definer has_role() function — no recursion risk.

-- training_sessions
CREATE POLICY "Admins can view all training sessions"
  ON public.training_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- fighter_sessions
CREATE POLICY "Admins can view all fighter sessions"
  ON public.fighter_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- coach_sessions
CREATE POLICY "Admins can view all coach sessions"
  ON public.coach_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- daily_reflections
CREATE POLICY "Admins can view all reflections"
  ON public.daily_reflections FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- pathway_nodes
CREATE POLICY "Admins can view all pathway nodes"
  ON public.pathway_nodes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- pathway_edges
CREATE POLICY "Admins can view all pathway edges"
  ON public.pathway_edges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- technique_chains
CREATE POLICY "Admins can view all technique chains"
  ON public.technique_chains FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- session_tags
CREATE POLICY "Admins can view all session tags"
  ON public.session_tags FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- strength_workout_exercises
CREATE POLICY "Admins can view all workout exercises"
  ON public.strength_workout_exercises FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- strength_workout_sets
CREATE POLICY "Admins can view all workout sets"
  ON public.strength_workout_sets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- assigned_programs
CREATE POLICY "Admins can view all assigned programs"
  ON public.assigned_programs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- assigned_program_sessions
CREATE POLICY "Admins can view all assigned program sessions"
  ON public.assigned_program_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- athlete_plan_assignments
CREATE POLICY "Admins can view all plan assignments"
  ON public.athlete_plan_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- athlete_plan_session_progress
CREATE POLICY "Admins can view all plan session progress"
  ON public.athlete_plan_session_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- body_composition_classifications
CREATE POLICY "Admins can view all body composition classifications"
  ON public.body_composition_classifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- notification_settings
CREATE POLICY "Admins can view all notification settings"
  ON public.notification_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- fighter_profiles
CREATE POLICY "Admins can view all fighter profiles"
  ON public.fighter_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- coach_invitations
CREATE POLICY "Admins can view all coach invitations"
  ON public.coach_invitations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
