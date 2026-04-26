-- 1. Add the delegation toggle (lives on the head coach's profile row)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hierarchy_delegation_enabled boolean NOT NULL DEFAULT false;

-- 2. Helper: is delegation currently enabled by ANY head coach?
-- (Single academy assumption — toggle is global across all head coaches.)
CREATE OR REPLACE FUNCTION public.delegated_nominations_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE coach_level = 'head_coach'::public.coach_level
      AND hierarchy_delegation_enabled = true
  )
$$;

-- 3. Helper: discipline-aware coach access (with MMA-sees-all rule)
CREATE OR REPLACE FUNCTION public.coach_can_access_discipline(_user_id uuid, _discipline text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins & head coaches see everything
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.is_head_coach(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id
        AND p.coach_level IS NOT NULL
        AND (
          'MMA' = ANY(p.assigned_disciplines)
          OR _discipline = ANY(p.assigned_disciplines)
        )
    );
$$;

-- 4. Update can_invite_coach_level to include level_2 → level_1 and gate via delegation
CREATE OR REPLACE FUNCTION public.can_invite_coach_level(_inviter uuid, _target_level public.coach_level)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_coach_level(_inviter) = 'head_coach'
      THEN _target_level IN ('head_coach','main_coach','level_2','level_1')
    WHEN public.get_coach_level(_inviter) = 'main_coach'
      THEN _target_level IN ('level_2','level_1')
        AND public.delegated_nominations_enabled()
    WHEN public.get_coach_level(_inviter) = 'level_2'
      THEN _target_level = 'level_1'
        AND public.delegated_nominations_enabled()
    ELSE false
  END
$$;

-- 5. Tighten coach_invitations INSERT policy to honor delegation + scope for main & L2
DROP POLICY IF EXISTS "Authorized coaches can create invitations" ON public.coach_invitations;

CREATE POLICY "Authorized coaches can create invitations"
ON public.coach_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.can_invite_coach_level(auth.uid(), coach_level)
  AND (
    -- Head coaches: any disciplines
    public.is_head_coach(auth.uid())
    -- Main coaches: only within own disciplines, only if delegation on
    OR (
      public.get_coach_level(auth.uid()) = 'main_coach'
      AND public.delegated_nominations_enabled()
      AND assigned_disciplines <@ public.get_coach_disciplines(auth.uid())
      AND array_length(assigned_disciplines, 1) > 0
    )
    -- Level 2 coaches: only within own disciplines, only if delegation on
    OR (
      public.get_coach_level(auth.uid()) = 'level_2'
      AND public.delegated_nominations_enabled()
      AND assigned_disciplines <@ public.get_coach_disciplines(auth.uid())
      AND array_length(assigned_disciplines, 1) > 0
    )
  )
);

-- 6. Allow head coaches to view & manage profiles of coaches they nominated
CREATE POLICY "Head coaches can view nominated coach profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_head_coach(auth.uid())
  AND coach_level IS NOT NULL
);

CREATE POLICY "Head coaches can update nominated coach profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_head_coach(auth.uid())
  AND coach_level IS NOT NULL
);