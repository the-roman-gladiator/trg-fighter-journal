import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FighterProfile {
  id: string;
  user_id: string;
  fighter_status: 'pending' | 'approved' | 'rejected';
  requested_fight_disciplines: string[];
  approved_fight_disciplines: string[];
  discipline_approved_by: string | null;
  discipline_approved_at: string | null;
  approved_by_head_coach: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useFighterProfile() {
  const { user, profile } = useAuth();
  const [fighterProfile, setFighterProfile] = useState<FighterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isHeadCoach = profile?.coach_level === 'head_coach';
  const isFighterApproved = fighterProfile?.fighter_status === 'approved';

  const fetchFighterProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('fighter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setFighterProfile(data as FighterProfile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFighterProfile(); }, [fetchFighterProfile]);

  const requestFighterAccess = async (disciplines: string[]) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('fighter_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('fighter_profiles')
        .update({
          requested_fight_disciplines: disciplines,
          fighter_status: 'pending',
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('fighter_profiles')
        .insert({
          user_id: user.id,
          requested_fight_disciplines: disciplines,
          fighter_status: 'pending',
        });
    }
    await fetchFighterProfile();
  };

  return {
    fighterProfile,
    loading,
    isHeadCoach,
    isFighterApproved,
    requestFighterAccess,
    refreshFighterProfile: fetchFighterProfile,
  };
}
