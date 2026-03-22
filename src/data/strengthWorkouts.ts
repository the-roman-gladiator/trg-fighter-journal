import { GuidedWorkoutSection } from './cardioWorkouts';

export interface GuidedStrengthWorkout {
  id: string;
  title: string;
  level: string;
  durationMinutes: number;
  phase: string;
  qrSlug: string;
  goal: string;
  sections: GuidedWorkoutSection[];
}

function ex(name: string, opts: { duration?: string; reps?: number }) {
  if (opts.duration) {
    const parseDuration = (d: string): number => {
      if (d.includes('min')) return parseInt(d) * 60;
      if (d.includes('s')) return parseInt(d);
      return 30;
    };
    return { name, duration: opts.duration, type: 'timed' as const, durationSeconds: parseDuration(opts.duration) };
  }
  return { name, reps: opts.reps, type: 'reps' as const, durationSeconds: 30 };
}

export const STRENGTH_WORKOUTS: GuidedStrengthWorkout[] = [
  {
    id: 'STRENGTH_1', title: 'Squat + Push Base', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-1',
    goal: 'Build squat and push foundation',
    sections: [
      { label: 'Warm-up', exercises: [ex('March in Place', { duration: '1 min' }), ex('Arm Circles', { duration: '1 min' }), ex('Bodyweight Squats', { reps: 10 }), ex('Wall Push-ups', { reps: 10 }), ex('Hip Mobility', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Goblet Squat', { reps: 10 }), ex('Dumbbell Floor Press', { reps: 10 }), ex('Dead Bug', { reps: 10 }), ex('Rest', { duration: '60s' })] },
      { label: 'Cooldown', exercises: [ex('Breathing Reset', { duration: '2 min' }), ex('Light Stretch', { duration: '3 min' })] },
    ],
  },
  {
    id: 'STRENGTH_2', title: 'Hinge + Pull Base', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-2',
    goal: 'Build hinge and pull foundation',
    sections: [
      { label: 'Warm-up', exercises: [ex('Arm Swings', { duration: '1 min' }), ex('Cat-Cow Stretch', { duration: '1 min' }), ex('Good Mornings', { reps: 10 }), ex('Band Pull-Aparts', { reps: 10 }), ex('Glute Activation', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Dumbbell Romanian Deadlift', { reps: 10 }), ex('Dumbbell Row', { reps: 10 }), ex('Glute Bridge', { reps: 12 }), ex('Rest', { duration: '60s' })] },
      { label: 'Cooldown', exercises: [ex('Breathing Reset', { duration: '2 min' }), ex('Hamstring Stretch', { duration: '3 min' })] },
    ],
  },
  {
    id: 'STRENGTH_3', title: 'Split Stance + Core', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-3',
    goal: 'Build single-leg stability and core control',
    sections: [
      { label: 'Warm-up', exercises: [ex('High Knees', { duration: '1 min' }), ex('Leg Swings', { duration: '1 min' }), ex('Bodyweight Lunges', { reps: 8 }), ex('Plank', { duration: '20s' }), ex('Hip Circles', { duration: '1 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Split Squat', { reps: 8 }), ex('Pallof Press Hold', { duration: '20s' }), ex('Step-ups', { reps: 10 }), ex('Bird Dog', { reps: 8 }), ex('Rest', { duration: '60s' })] },
      { label: 'Cooldown', exercises: [ex('Deep Breathing', { duration: '2 min' }), ex('Hip Flexor Stretch', { duration: '3 min' })] },
    ],
  },
  {
    id: 'STRENGTH_4', title: 'Full Body Intro', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-4',
    goal: 'Full body movement integration',
    sections: [
      { label: 'Warm-up', exercises: [ex('Jump Rope (easy)', { duration: '2 min' }), ex('Arm Circles', { duration: '1 min' }), ex('Bodyweight Squats', { reps: 10 }), ex('Push-ups', { reps: 5 })] },
      { label: 'Main Block', repeat: 3, exercises: [ex('Goblet Squat', { reps: 10 }), ex('Push-ups', { reps: 8 }), ex('Dumbbell Row', { reps: 10 }), ex('Plank', { duration: '30s' }), ex('Farmer Carry', { duration: '30s' }), ex('Rest', { duration: '60s' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '2 min' }), ex('Full Body Stretch', { duration: '3 min' })] },
    ],
  },
  {
    id: 'STRENGTH_5', title: 'Controlled Strength Circuit', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-5',
    goal: 'Controlled tempo strength work',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Walk', { duration: '2 min' }), ex('Dynamic Stretching', { duration: '2 min' }), ex('Wall Sit', { duration: '20s' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Tempo Squat (3s down)', { reps: 8 }), ex('Incline Push-ups (slow)', { reps: 8 }), ex('Dead Bug', { reps: 10 }), ex('Wall Sit', { duration: '20s' }), ex('Rest', { duration: '60s' })] },
      { label: 'Cooldown', exercises: [ex('Breathing Reset', { duration: '2 min' }), ex('Quad Stretch', { duration: '3 min' })] },
    ],
  },
  {
    id: 'STRENGTH_6', title: 'Strength Endurance Base', level: 'Beginner',
    durationMinutes: 30, phase: 'Beginner Strength', qrSlug: 'strength-6',
    goal: 'Build muscular endurance for martial arts',
    sections: [
      { label: 'Warm-up', exercises: [ex('March in Place', { duration: '2 min' }), ex('Arm Swings', { duration: '1 min' }), ex('Leg Swings', { duration: '1 min' }), ex('Squats', { reps: 10 })] },
      { label: 'Main Block', repeat: 3, exercises: [ex('Bodyweight Squats', { reps: 15 }), ex('Push-ups', { reps: 10 }), ex('Dumbbell Row', { reps: 12 }), ex('Glute Bridge', { reps: 15 }), ex('Plank', { duration: '30s' }), ex('Rest', { duration: '45s' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '2 min' }), ex('Full Body Stretch', { duration: '3 min' })] },
    ],
  },
];

export const STRENGTH_ROTATION: Record<number, string[]> = {
  1: ['STRENGTH_1', 'STRENGTH_2'],
  2: ['STRENGTH_3', 'STRENGTH_4'],
  3: ['STRENGTH_5', 'STRENGTH_6'],
};

export const ALL_GUIDED_WORKOUTS = [...STRENGTH_WORKOUTS];

export function getStrengthUnlockStatus(completedCardioSessions: number, recentSkips: number, avgRpe: number) {
  const sessionsReady = completedCardioSessions >= 8;
  const noRecentSkips = recentSkips === 0;
  const fatigueManageable = avgRpe <= 7;
  const unlocked = sessionsReady && noRecentSkips && fatigueManageable;

  return {
    unlocked,
    sessionsReady,
    noRecentSkips,
    fatigueManageable,
    sessionsCompleted: completedCardioSessions,
    sessionsRequired: 8,
    progressPercent: Math.min(100, Math.round((completedCardioSessions / 8) * 100)),
  };
}

export function calculateReadiness(recentRpe: number[], completionRate: number, skippedRecent: number): { score: number; label: string } {
  if (recentRpe.length === 0) return { score: 50, label: 'No Data' };
  const avgRpe = recentRpe.reduce((a, b) => a + b, 0) / recentRpe.length;
  const fatigueBalance = Math.max(0, 100 - (avgRpe * 10));
  const consistencyScore = completionRate;
  const skipPenalty = skippedRecent * 10;
  const score = Math.round(Math.max(0, Math.min(100, (fatigueBalance * 0.4 + consistencyScore * 0.5 + (100 - skipPenalty) * 0.1))));
  if (score >= 75) return { score, label: 'High' };
  if (score >= 50) return { score, label: 'Moderate' };
  return { score, label: 'Low' };
}

export function calculateFatigue(recentRpe: number[], painFlags: number): { score: number; label: string } {
  if (recentRpe.length === 0) return { score: 30, label: 'Fresh' };
  const avgRpe = recentRpe.reduce((a, b) => a + b, 0) / recentRpe.length;
  const score = Math.round(Math.min(100, avgRpe * 10 + painFlags * 15));
  if (score <= 30) return { score, label: 'Fresh' };
  if (score <= 55) return { score, label: 'Managed' };
  if (score <= 75) return { score, label: 'Elevated' };
  return { score, label: 'High' };
}
