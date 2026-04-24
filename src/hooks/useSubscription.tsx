import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'free' | 'fighter' | 'coach' | 'pro' | 'pro_coach';

interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPro: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier('free');
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [subRes, roleRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('tier,status,expires_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const sub = subRes.data;
      const active =
        sub?.status === 'active' &&
        (!sub.expires_at || new Date(sub.expires_at) > new Date());
      setTier(active ? (sub.tier as SubscriptionTier) : 'free');
      setIsAdmin(!!roleRes.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isPro = isAdmin || tier === 'pro' || tier === 'pro_coach';

  return { tier, isPro, isAdmin, loading };
}
