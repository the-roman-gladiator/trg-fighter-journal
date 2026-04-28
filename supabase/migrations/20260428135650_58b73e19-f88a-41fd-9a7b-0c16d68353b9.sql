-- ============================================================
-- COACH NOTES REWORK
-- ============================================================

-- 1) Extend coach_sessions: type, technical fields, visibility scope
ALTER TABLE public.coach_sessions
  ADD COLUMN IF NOT EXISTS note_type text NOT NULL DEFAULT 'class_plan',
  ADD COLUMN IF NOT EXISTS technique text,
  ADD COLUMN IF NOT EXISTS tactic text,
  ADD COLUMN IF NOT EXISTS first_movement text,
  ADD COLUMN IF NOT EXISTS opponent_action text,
  ADD COLUMN IF NOT EXISTS second_movement text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'private',
  -- visibility_scope: 'private' | 'selected_coaches' | 'all_coaches'
  ADD COLUMN IF NOT EXISTS target_group text;
  -- target_group on class plans: 'all_students' | 'beginners' | 'intermediate' | 'advanced' | 'fighters' | NULL

-- Validate values via CHECK
ALTER TABLE public.coach_sessions
  DROP CONSTRAINT IF EXISTS coach_sessions_note_type_chk;
ALTER TABLE public.coach_sessions
  ADD CONSTRAINT coach_sessions_note_type_chk
  CHECK (note_type IN ('class_plan','technical_note'));

ALTER TABLE public.coach_sessions
  DROP CONSTRAINT IF EXISTS coach_sessions_visibility_chk;
ALTER TABLE public.coach_sessions
  ADD CONSTRAINT coach_sessions_visibility_chk
  CHECK (visibility_scope IN ('private','selected_coaches','all_coaches'));

-- 2) Tighten RLS on coach_sessions: drop broad athlete read access
DROP POLICY IF EXISTS "Athletes can view completed coach sessions" ON public.coach_sessions;
DROP POLICY IF EXISTS "Athletes can view scheduled coach sessions" ON public.coach_sessions;

-- 3) student_save_offers: who is allowed to save which coach note
CREATE TABLE IF NOT EXISTS public.coach_note_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'saved' | 'dismissed' | 'deleted_after_save'
  saved_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_session_id, student_id)
);

ALTER TABLE public.coach_note_offers
  DROP CONSTRAINT IF EXISTS coach_note_offers_status_chk;
ALTER TABLE public.coach_note_offers
  ADD CONSTRAINT coach_note_offers_status_chk
  CHECK (status IN ('pending','saved','dismissed','deleted_after_save'));

CREATE INDEX IF NOT EXISTS idx_offers_student ON public.coach_note_offers(student_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_coach_session ON public.coach_note_offers(coach_session_id);

ALTER TABLE public.coach_note_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own offers"
  ON public.coach_note_offers FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Student sees offers addressed to them"
  ON public.coach_note_offers FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Student updates own offer status"
  ON public.coach_note_offers FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins view all offers"
  ON public.coach_note_offers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) coach_note_shares: coach-to-coach sharing
CREATE TABLE IF NOT EXISTS public.coach_note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_with uuid NOT NULL, -- coach user_id; for 'all_coaches' shares we still write rows per coach OR check via parent coach_sessions.visibility_scope
  permission text NOT NULL DEFAULT 'view',
  -- 'view' | 'comment'
  see_student_status boolean NOT NULL DEFAULT false,
  see_class_plan boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_session_id, shared_with)
);

ALTER TABLE public.coach_note_shares
  DROP CONSTRAINT IF EXISTS coach_note_shares_permission_chk;
ALTER TABLE public.coach_note_shares
  ADD CONSTRAINT coach_note_shares_permission_chk
  CHECK (permission IN ('view','comment'));

CREATE INDEX IF NOT EXISTS idx_shares_with ON public.coach_note_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_shares_session ON public.coach_note_shares(coach_session_id);

ALTER TABLE public.coach_note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages shares"
  ON public.coach_note_shares FOR ALL TO authenticated
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Recipient views own shares"
  ON public.coach_note_shares FOR SELECT TO authenticated
  USING (shared_with = auth.uid());

CREATE POLICY "Admins view all shares"
  ON public.coach_note_shares FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Helper: can current user view a coach session?
CREATE OR REPLACE FUNCTION public.can_view_coach_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_sessions cs
    WHERE cs.id = _session_id
      AND (
        cs.user_id = _user_id
        OR has_role(_user_id, 'admin'::public.app_role)
        OR is_head_coach(_user_id)
        -- shared explicitly with this coach
        OR EXISTS (
          SELECT 1 FROM public.coach_note_shares s
          WHERE s.coach_session_id = cs.id AND s.shared_with = _user_id
        )
        -- shared with all coaches and this user is a coach
        OR (
          cs.visibility_scope = 'all_coaches'
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = _user_id AND p.coach_level IS NOT NULL
          )
        )
      )
  )
$$;

-- New SELECT policy on coach_sessions using helper
DROP POLICY IF EXISTS "Coaches and shared users can view coach sessions" ON public.coach_sessions;
CREATE POLICY "Coaches and shared users can view coach sessions"
  ON public.coach_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_head_coach(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.coach_note_shares s
      WHERE s.coach_session_id = coach_sessions.id AND s.shared_with = auth.uid()
    )
    OR (
      visibility_scope = 'all_coaches'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.coach_level IS NOT NULL)
    )
  );

-- 6) coach_note_comments
CREATE TABLE IF NOT EXISTS public.coach_note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_session_id uuid NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_session ON public.coach_note_comments(coach_session_id);

ALTER TABLE public.coach_note_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comments if can view session"
  ON public.coach_note_comments FOR SELECT TO authenticated
  USING (public.can_view_coach_session(coach_session_id, auth.uid()));

CREATE POLICY "Comment if owner or has comment permission"
  ON public.coach_note_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.coach_sessions cs WHERE cs.id = coach_session_id AND cs.user_id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_head_coach(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.coach_note_shares s
        WHERE s.coach_session_id = coach_note_comments.coach_session_id
          AND s.shared_with = auth.uid()
          AND s.permission = 'comment'
      )
    )
  );

CREATE POLICY "Author edits own comment"
  ON public.coach_note_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "Author or note owner deletes comment"
  ON public.coach_note_comments FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.coach_sessions cs WHERE cs.id = coach_session_id AND cs.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 7) Snapshot fields on training_sessions for saved coach notes
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS saved_from_coach_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_note_snapshot jsonb;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.coach_note_offers;
CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.coach_note_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.coach_note_comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.coach_note_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
