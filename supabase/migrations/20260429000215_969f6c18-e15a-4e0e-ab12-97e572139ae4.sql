CREATE OR REPLACE FUNCTION public.admin_set_account_tier(_target uuid, _tier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _tier NOT IN ('free','basic','pro','pro_coach') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_tier');
  END IF;

  UPDATE public.profiles SET account_type = _tier, updated_at = now() WHERE id = _target;

  -- Keep subscriptions table in sync so Pro features unlock immediately.
  INSERT INTO public.subscriptions (user_id, tier, status, expires_at)
  VALUES (
    _target,
    CASE WHEN _tier IN ('pro','pro_coach') THEN _tier::public.subscription_tier
         ELSE 'free'::public.subscription_tier END,
    'active',
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        status = 'active',
        expires_at = NULL,
        updated_at = now();

  INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'tier_changed', 'user', _target::text, jsonb_build_object('tier', _tier));

  RETURN jsonb_build_object('success', true);
END;
$function$;