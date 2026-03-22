import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PlanAssignment {
  id: string;
  workout_plan_id: string;
  start_date: string;
  current_week: number;
  current_session_number: number;
  status: string;
  completed_sessions_count: number;
  completion_percentage: number;
  is_active: boolean;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  discipline: string;
  level: string;
  duration_weeks: number;
  sessions_per_week: number;
  description: string;
  progression_weeks_1_4: string;
  progression_weeks_5_8: string;
  progression_weeks_9_12: string;
}

export interface SessionProgress {
  id: string;
  athlete_plan_assignment_id: string;
  week_number: number;
  session_number: number;
  workout_template_id: string;
  workout_log_id: string | null;
  status: string;
  session_label?: string;
}

export interface PlanWeek {
  week_number: number;
  phase_label: string;
  weekly_goal: string;
}

export function useGuidedPathway() {
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState<PlanAssignment | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<SessionProgress[]>([]);
  const [planSessions, setPlanSessions] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextSession, setNextSession] = useState<SessionProgress | null>(null);

  const strengthProfile = profile as any;
  const discipline = strengthProfile?.discipline || 'MMA';
  const level = strengthProfile?.strength_level || 'Beginner';

  const fetchPathway = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check for existing active assignment
    const { data: assignments } = await supabase
      .from('athlete_plan_assignments' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const existingAssignment = (assignments as any[])?.[0];

    if (existingAssignment) {
      setAssignment(existingAssignment);
      await loadPlanData(existingAssignment);
    } else {
      // Auto-assign plan based on discipline + level
      await autoAssignPlan();
    }

    setLoading(false);
  }, [user, discipline, level]);

  const autoAssignPlan = async () => {
    if (!user) return;

    // Find matching plan
    const { data: plans } = await supabase
      .from('workout_plans' as any)
      .select('*')
      .eq('discipline', discipline)
      .eq('level', level)
      .eq('is_active', true)
      .limit(1);

    const matchingPlan = (plans as any[])?.[0];
    if (!matchingPlan) return;

    // Create assignment
    const { data: newAssignment, error } = await supabase
      .from('athlete_plan_assignments' as any)
      .insert({
        user_id: user.id,
        workout_plan_id: matchingPlan.id,
        start_date: new Date().toISOString().split('T')[0],
        current_week: 1,
        current_session_number: 1,
        status: 'active',
        is_active: true,
      } as any)
      .select('*')
      .single();

    if (error || !newAssignment) return;
    const a = newAssignment as any;

    // Fetch plan sessions to create progress rows
    const { data: pSessions } = await supabase
      .from('workout_plan_sessions' as any)
      .select('*')
      .eq('workout_plan_id', matchingPlan.id)
      .order('week_number')
      .order('session_number');

    const progressRows = ((pSessions || []) as any[]).map((ps: any) => ({
      athlete_plan_assignment_id: a.id,
      week_number: ps.week_number,
      session_number: ps.session_number,
      workout_template_id: ps.workout_template_id,
      status: ps.week_number === 1 && ps.session_number === 1 ? 'available' : 'locked',
    }));

    if (progressRows.length > 0) {
      await supabase.from('athlete_plan_session_progress' as any).insert(progressRows);
    }

    setAssignment(a);
    await loadPlanData(a);
  };

  const loadPlanData = async (a: any) => {
    // Load plan details
    const { data: planData } = await supabase
      .from('workout_plans' as any)
      .select('*')
      .eq('id', a.workout_plan_id)
      .single();

    if (planData) setPlan(planData as any);

    // Load weeks
    const { data: weekData } = await supabase
      .from('workout_plan_weeks' as any)
      .select('*')
      .eq('workout_plan_id', a.workout_plan_id)
      .order('week_number');

    setWeeks((weekData || []) as any[]);

    // Load session progress
    const { data: progressData } = await supabase
      .from('athlete_plan_session_progress' as any)
      .select('*')
      .eq('athlete_plan_assignment_id', a.id)
      .order('week_number')
      .order('session_number');

    const progressSessions = (progressData || []) as any[];

    // Load plan session labels
    const { data: pSessions } = await supabase
      .from('workout_plan_sessions' as any)
      .select('*')
      .eq('workout_plan_id', a.workout_plan_id)
      .order('week_number')
      .order('session_number');

    setPlanSessions((pSessions || []) as any[]);

    // Merge labels into progress
    const labelMap = new Map<string, string>();
    ((pSessions || []) as any[]).forEach((ps: any) => {
      labelMap.set(`${ps.week_number}-${ps.session_number}`, ps.session_label || '');
    });

    const enriched = progressSessions.map(s => ({
      ...s,
      session_label: labelMap.get(`${s.week_number}-${s.session_number}`) || '',
    }));

    setSessions(enriched);

    // Find next available session
    const next = enriched.find(s => s.status === 'available' || s.status === 'in_progress');
    setNextSession(next || null);
  };

  const completeSession = async (sessionProgressId: string, workoutLogId: string) => {
    if (!assignment) return;

    // Mark current session as completed
    await supabase
      .from('athlete_plan_session_progress' as any)
      .update({
        status: 'completed',
        workout_log_id: workoutLogId,
        completed_at: new Date().toISOString(),
        completion_percentage: 100,
      } as any)
      .eq('id', sessionProgressId);

    // Find and unlock next session
    const currentIdx = sessions.findIndex(s => s.id === sessionProgressId);
    if (currentIdx >= 0 && currentIdx < sessions.length - 1) {
      const nextS = sessions[currentIdx + 1];
      if (nextS.status === 'locked') {
        await supabase
          .from('athlete_plan_session_progress' as any)
          .update({ status: 'available' } as any)
          .eq('id', nextS.id);
      }
    }

    // Update assignment counts
    const completedCount = sessions.filter(s => s.status === 'completed').length + 1;
    const totalSessions = sessions.length;
    const newWeek = sessions[currentIdx + 1]
      ? sessions[currentIdx + 1].week_number
      : assignment.current_week;

    await supabase
      .from('athlete_plan_assignments' as any)
      .update({
        completed_sessions_count: completedCount,
        completion_percentage: Math.round((completedCount / totalSessions) * 100),
        current_week: newWeek,
        current_session_number: sessions[currentIdx + 1]?.session_number || assignment.current_session_number,
        status: completedCount >= totalSessions ? 'completed' : 'active',
      } as any)
      .eq('id', assignment.id);

    await fetchPathway();
  };

  const getPhaseLabel = (week: number): string => {
    if (week <= 4) return 'Technique + Base Volume';
    if (week <= 8) return 'Increased Load + Intensity';
    return 'Peak Power + Speed';
  };

  const getPhaseColor = (week: number): string => {
    if (week <= 4) return 'bg-blue-500/10 text-blue-700';
    if (week <= 8) return 'bg-amber-500/10 text-amber-700';
    return 'bg-red-500/10 text-red-700';
  };

  useEffect(() => {
    fetchPathway();
  }, [fetchPathway]);

  return {
    assignment,
    plan,
    sessions,
    weeks,
    nextSession,
    loading,
    completeSession,
    getPhaseLabel,
    getPhaseColor,
    refetch: fetchPathway,
  };
}
