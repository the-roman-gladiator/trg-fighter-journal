import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionTier = 'free' | 'fighter' | 'coach' | 'pro' | 'pro_coach';

interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPro: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const SubscriptionContext = createContext<UseSubscriptionResult>({
  tier: 'free',
  isPro: false,
  isAdmin: false,
  loading: true,
});

export const useSubscription = (): UseSubscriptionResult => useContext(SubscriptionContext);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
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

  return (
    <SubscriptionContext.Provider value={{ tier, isPro, isAdmin, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
