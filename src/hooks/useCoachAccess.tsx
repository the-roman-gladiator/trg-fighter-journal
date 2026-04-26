import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type CoachLevel = 'head_coach' | 'main_coach' | 'level_2' | 'level_1';

export const ALL_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

/**
 * Centralized coach permission + discipline access hook.
 *
 * Rules:
 * - head_coach            → full access to all disciplines, can nominate anyone.
 * - main_coach            → MMA in disciplines ⇒ all disciplines, otherwise only assigned.
 *                           Can nominate level_2 / level_1 ONLY when delegation is on.
 * - level_2               → same discipline rule as main_coach.
 *                           Can nominate level_1 ONLY when delegation is on.
 * - level_1               → same discipline rule. Cannot nominate.
 */
export function useCoachAccess() {
  const { profile } = useAuth();
  const [delegationEnabled, setDelegationEnabled] = useState(false);

  const coachLevel = (profile?.coach_level ?? null) as CoachLevel | null;
  const assignedDisciplines: string[] =
    (profile as any)?.assigned_disciplines ?? [];

  const isHeadCoach = coachLevel === 'head_coach';
  const isMainCoach = coachLevel === 'main_coach';
  const isLevel2 = coachLevel === 'level_2';
  const isLevel1 = coachLevel === 'level_1';
  const isCoach = !!coachLevel;

  // MMA-sees-all rule
  const hasMMA = assignedDisciplines.includes('MMA');
  const accessibleDisciplines = useMemo<string[]>(() => {
    if (isHeadCoach) return ALL_DISCIPLINES;
    if (!isCoach) return [];
    if (hasMMA) return ALL_DISCIPLINES;
    return assignedDisciplines;
  }, [isHeadCoach, isCoach, hasMMA, assignedDisciplines.join(',')]);

  // Watch delegation toggle (any head coach turning it on enables it globally)
  useEffect(() => {
    let active = true;
    const fetchDelegation = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('hierarchy_delegation_enabled')
        .eq('coach_level', 'head_coach')
        .eq('hierarchy_delegation_enabled', true)
        .limit(1);
      if (active) setDelegationEnabled((data?.length ?? 0) > 0);
    };
    fetchDelegation();
    return () => { active = false; };
  }, [profile?.id, (profile as any)?.hierarchy_delegation_enabled]);

  // Levels this coach can nominate
  const allowedNominationLevels: CoachLevel[] = useMemo(() => {
    if (isHeadCoach) return ['head_coach', 'main_coach', 'level_2', 'level_1'];
    if (isMainCoach && delegationEnabled) return ['level_2', 'level_1'];
    if (isLevel2 && delegationEnabled) return ['level_1'];
    return [];
  }, [isHeadCoach, isMainCoach, isLevel2, delegationEnabled]);

  const canNominate = allowedNominationLevels.length > 0;

  // Disciplines this coach can ASSIGN to invitees
  const assignableDisciplines: string[] = isHeadCoach
    ? ALL_DISCIPLINES
    : assignedDisciplines;

  const canAccessDiscipline = (discipline: string) =>
    accessibleDisciplines.includes(discipline);

  return {
    coachLevel,
    isHeadCoach,
    isMainCoach,
    isLevel2,
    isLevel1,
    isCoach,
    assignedDisciplines,
    accessibleDisciplines,
    assignableDisciplines,
    delegationEnabled,
    canNominate,
    allowedNominationLevels,
    canAccessDiscipline,
  };
}
