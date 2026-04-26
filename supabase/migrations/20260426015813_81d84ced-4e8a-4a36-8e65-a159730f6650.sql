-- 1. Add assigned_disciplines + invited_by to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_disciplines text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invited_by uuid;

-- 2. Coach invitations table
CREATE TABLE IF NOT EXISTS public.coach_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  coach_level public.coach_level NOT NULL,
  assigned_disciplines text[] NOT NULL DEFAULT '{}',
  invited_by uuid NOT NULL,
  invited_by_level public.coach_level NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | revoked | expired
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_invitations_email ON public.coach_invitations(lower(invited_email));
CREATE INDEX IF NOT EXISTS idx_coach_invitations_code ON public.coach_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_inviter ON public.coach_invitations(invited_by);

ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;

-- 3. Helper: get inviter's coach_level (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.get_coach_level(_user_id uuid)
RETURNS public.coach_level
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coach_level FROM public.profiles WHERE id = _user_id
$$;

-- 4. Helper: get coach's assigned disciplines
CREATE OR REPLACE FUNCTION public.get_coach_disciplines(_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(assigned_disciplines, '{}') FROM public.profiles WHERE id = _user_id
$$;

-- 5. Helper: can _inviter invite at _target level?
CREATE OR REPLACE FUNCTION public.can_invite_coach_level(_inviter uuid, _target_level public.coach_level)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_coach_level(_inviter) = 'head_coach'
      THEN _target_level IN ('head_coach','main_coach','level_2','level_1')
    WHEN public.get_coach_level(_inviter) = 'main_coach'
      THEN _target_level IN ('level_2','level_1')
    ELSE false
  END
$$;

-- 6. RLS for coach_invitations
DROP POLICY IF EXISTS "Inviters can view own invitations" ON public.coach_invitations;
CREATE POLICY "Inviters can view own invitations"
ON public.coach_invitations FOR SELECT TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_head_coach(auth.uid())
  OR lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
);

DROP POLICY IF EXISTS "Authorized coaches can create invitations" ON public.coach_invitations;
CREATE POLICY "Authorized coaches can create invitations"
ON public.coach_invitations FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.can_invite_coach_level(auth.uid(), coach_level)
  AND (
    public.is_head_coach(auth.uid())
    OR (
      public.get_coach_level(auth.uid()) = 'main_coach'
      AND assigned_disciplines <@ public.get_coach_disciplines(auth.uid())
      AND array_length(assigned_disciplines, 1) > 0
    )
  )
);

DROP POLICY IF EXISTS "Inviters and head coaches can update invitations" ON public.coach_invitations;
CREATE POLICY "Inviters and head coaches can update invitations"
ON public.coach_invitations FOR UPDATE TO authenticated
USING (
  invited_by = auth.uid()
  OR public.is_head_coach(auth.uid())
  OR (status = 'pending' AND lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'), '')))
);

-- 7. RPC to redeem an invitation by code (after signup)
CREATE OR REPLACE FUNCTION public.redeem_coach_invitation(_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv public.coach_invitations%ROWTYPE;
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  IF user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.coach_invitations
  WHERE invite_code = upper(_code) AND status = 'pending'
  LIMIT 1;

  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;
  IF inv.expires_at < now() THEN
    UPDATE public.coach_invitations SET status='expired', updated_at=now() WHERE id = inv.id;
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF lower(inv.invited_email) <> lower(user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
  END IF;

  UPDATE public.profiles
  SET coach_level = inv.coach_level,
      assigned_disciplines = inv.assigned_disciplines,
      invited_by = inv.invited_by,
      approval_status = 'approved',
      approved_by = inv.invited_by,
      updated_at = now()
  WHERE id = auth.uid();

  UPDATE public.coach_invitations
  SET status='accepted', accepted_by=auth.uid(), accepted_at=now(), updated_at=now()
  WHERE id = inv.id;

  RETURN jsonb_build_object('success', true, 'coach_level', inv.coach_level);
END;
$$;

-- 8. RPC to instantly promote an existing user (head/main coach action)
CREATE OR REPLACE FUNCTION public.promote_existing_user_to_coach(
  _email text,
  _coach_level public.coach_level,
  _disciplines text[]
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_id uuid;
  inviter_level public.coach_level;
  inviter_disciplines text[];
BEGIN
  IF NOT public.can_invite_coach_level(auth.uid(), _coach_level) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  inviter_level := public.get_coach_level(auth.uid());
  inviter_disciplines := public.get_coach_disciplines(auth.uid());

  -- main coach can only assign within own disciplines
  IF inviter_level = 'main_coach' THEN
    IF NOT (_disciplines <@ inviter_disciplines) OR array_length(_disciplines,1) IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'discipline_out_of_scope');
    END IF;
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  UPDATE public.profiles
  SET coach_level = _coach_level,
      assigned_disciplines = _disciplines,
      invited_by = auth.uid(),
      approval_status = 'approved',
      approved_by = auth.uid(),
      updated_at = now()
  WHERE id = target_id;

  RETURN jsonb_build_object('success', true, 'user_id', target_id);
END;
$$;

-- 9. Trigger to keep updated_at fresh on coach_invitations
DROP TRIGGER IF EXISTS trg_coach_invitations_updated_at ON public.coach_invitations;
CREATE TRIGGER trg_coach_invitations_updated_at
BEFORE UPDATE ON public.coach_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Backfill: existing head coach gets all 6 disciplines as assigned (so dashboard works)
UPDATE public.profiles
SET assigned_disciplines = ARRAY['MMA','Muay Thai','K1','Wrestling','Grappling','BJJ']
WHERE coach_level = 'head_coach' AND (assigned_disciplines IS NULL OR cardinality(assigned_disciplines) = 0);
