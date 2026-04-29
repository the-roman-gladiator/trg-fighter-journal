INSERT INTO public.subscriptions (user_id, tier, status)
SELECT p.id, p.account_type::public.subscription_tier, 'active'
FROM public.profiles p
WHERE p.account_type IN ('pro', 'pro_coach')
ON CONFLICT (user_id) DO UPDATE
  SET tier = EXCLUDED.tier,
      status = 'active',
      expires_at = NULL,
      updated_at = now();