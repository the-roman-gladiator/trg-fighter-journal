-- 1. Add suspended flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- 2. Admin actions audit log
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor ON public.admin_actions (actor_id);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view admin actions"
  ON public.admin_actions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert admin actions"
  ON public.admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND actor_id = auth.uid()
  );

-- 3. Admin RPC: set or remove a role for a user
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target uuid, _role public.app_role, _grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target, _role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
  END IF;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN _grant THEN 'role_granted' ELSE 'role_revoked' END,
    'user',
    _target::text,
    jsonb_build_object('role', _role)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;

-- 4. Admin RPC: suspend/unsuspend a user
CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(_target uuid, _suspended boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.profiles SET suspended = _suspended, updated_at = now() WHERE id = _target;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN _suspended THEN 'user_suspended' ELSE 'user_unsuspended' END,
    'user',
    _target::text,
    '{}'::jsonb
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) TO authenticated;

-- 5. Admin RPC: set account tier
CREATE OR REPLACE FUNCTION public.admin_set_account_tier(_target uuid, _tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _tier NOT IN ('free','basic','pro','pro_coach') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_tier');
  END IF;

  UPDATE public.profiles SET account_type = _tier, updated_at = now() WHERE id = _target;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'tier_changed', 'user', _target::text, jsonb_build_object('tier', _tier));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_account_tier(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_tier(uuid, text) TO authenticated;

-- 6. Admin RPC: approve / deny fighter profile
CREATE OR REPLACE FUNCTION public.admin_decide_fighter_profile(_profile_id uuid, _approve boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  SELECT user_id INTO uid FROM public.fighter_profiles WHERE id = _profile_id;

  IF _approve THEN
    UPDATE public.fighter_profiles
    SET fighter_status = 'approved',
        approved_by_head_coach = auth.uid(),
        approved_at = now(),
        approved_fight_disciplines = requested_fight_disciplines,
        discipline_approved_by = auth.uid(),
        discipline_approved_at = now(),
        updated_at = now()
    WHERE id = _profile_id;
  ELSE
    UPDATE public.fighter_profiles
    SET fighter_status = 'denied', updated_at = now()
    WHERE id = _profile_id;
  END IF;

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN _approve THEN 'fighter_approved' ELSE 'fighter_denied' END,
    'fighter_profile',
    _profile_id::text,
    jsonb_build_object('user_id', uid)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_decide_fighter_profile(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_fighter_profile(uuid, boolean) TO authenticated;

-- 7. Trigger to keep updated_at fresh on admin_actions (no updates expected, but safe)
-- (skipped — admin_actions is append-only)
