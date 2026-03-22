export interface GuidedExercise {
  name: string;
  duration?: string;
  reps?: number;
  type: 'timed' | 'reps';
  durationSeconds?: number;
}

export interface GuidedWorkoutSection {
  label: string;
  repeat?: number;
  exercises: GuidedExercise[];
}

export interface GuidedCardioWorkout {
  id: string;
  title: string;
  level: string;
  durationMinutes: number;
  phase: string;
  qrSlug: string;
  sections: GuidedWorkoutSection[];
}

function parseDuration(d: string): number {
  if (d.includes('min')) return parseInt(d) * 60;
  if (d.includes('s')) return parseInt(d);
  return 30;
}

function ex(name: string, opts: { duration?: string; reps?: number }): GuidedExercise {
  if (opts.duration) {
    return { name, duration: opts.duration, type: 'timed', durationSeconds: parseDuration(opts.duration) };
  }
  return { name, reps: opts.reps, type: 'reps', durationSeconds: 30 };
}

export const CARDIO_WORKOUTS: GuidedCardioWorkout[] = [
  {
    id: 'CARDIO_1', title: 'Walk + Basic Circuit', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-1',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Walk', { duration: '3 min' }), ex('Arm Circles', { duration: '1 min' }), ex('Leg Swings', { duration: '1 min' })] },
      { label: 'Main Block', repeat: 5, exercises: [ex('Brisk Walk', { duration: '2 min' }), ex('Squats', { reps: 10 }), ex('Wall Push-ups', { reps: 10 }), ex('Plank', { duration: '20s' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '3 min' }), ex('Deep Breathing', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_2', title: 'Bike Interval Intro', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-2',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Bike', { duration: '3 min' }), ex('Dynamic Stretching', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 6, exercises: [ex('Moderate Bike', { duration: '90s' }), ex('Easy Bike Recovery', { duration: '90s' })] },
      { label: 'Cooldown', exercises: [ex('Easy Bike', { duration: '3 min' }), ex('Breathing', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_3', title: 'Step + Core Flow', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-3',
    sections: [
      { label: 'Warm-up', exercises: [ex('March in Place', { duration: '3 min' }), ex('Hip Circles', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Step-ups', { reps: 12 }), ex('Dead Bugs', { reps: 10 }), ex('Glute Bridge', { reps: 12 }), ex('Bird Dog', { reps: 8 }), ex('Rest', { duration: '30s' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '3 min' }), ex('Stretching', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_4', title: 'Low Impact Circuit', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-4',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Walk', { duration: '3 min' }), ex('Ankle Circles', { duration: '1 min' }), ex('Arm Swings', { duration: '1 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Marching', { duration: '2 min' }), ex('Wall Sit', { duration: '20s' }), ex('Incline Push-ups', { reps: 8 }), ex('Standing Crunches', { reps: 12 })] },
      { label: 'Cooldown', exercises: [ex('Gentle Walk', { duration: '3 min' }), ex('Deep Breathing', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_5', title: 'Continuous Walk + Core', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-5',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Walk', { duration: '5 min' })] },
      { label: 'Main Block', repeat: 1, exercises: [ex('Brisk Walk', { duration: '10 min' }), ex('Plank', { duration: '30s' }), ex('Sit-ups', { reps: 15 }), ex('Glute Bridge', { reps: 15 }), ex('Brisk Walk', { duration: '5 min' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '3 min' }), ex('Stretching', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_6', title: 'Row/Bike Mix', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-6',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Row or Bike', { duration: '3 min' }), ex('Dynamic Stretching', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('Row 200m', { duration: '90s' }), ex('Bike Easy', { duration: '90s' }), ex('Bodyweight Squats', { reps: 10 }), ex('Rest', { duration: '30s' })] },
      { label: 'Cooldown', exercises: [ex('Easy Row or Bike', { duration: '3 min' }), ex('Breathing', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_7', title: 'Simple Conditioning Circuit', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-7',
    sections: [
      { label: 'Warm-up', exercises: [ex('Jump Rope (easy)', { duration: '2 min' }), ex('Arm Circles', { duration: '1 min' }), ex('Leg Swings', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 5, exercises: [ex('Jump Rope', { duration: '40s' }), ex('Push-ups', { reps: 8 }), ex('Squats', { reps: 10 }), ex('Mountain Climbers', { duration: '20s' }), ex('Rest', { duration: '30s' })] },
      { label: 'Cooldown', exercises: [ex('Walk', { duration: '3 min' }), ex('Deep Breathing', { duration: '2 min' })] },
    ],
  },
  {
    id: 'CARDIO_8', title: 'Mixed Flow Session', level: 'Early Beginner',
    durationMinutes: 30, phase: 'Cardio Base', qrSlug: 'cardio-8',
    sections: [
      { label: 'Warm-up', exercises: [ex('Easy Walk', { duration: '3 min' }), ex('Hip Openers', { duration: '2 min' })] },
      { label: 'Main Block', repeat: 4, exercises: [ex('High Knees', { duration: '30s' }), ex('Lunges', { reps: 10 }), ex('Plank', { duration: '25s' }), ex('Burpees (slow)', { reps: 5 }), ex('Rest', { duration: '40s' })] },
      { label: 'Cooldown', exercises: [ex('Slow Walk', { duration: '3 min' }), ex('Stretching', { duration: '2 min' })] },
    ],
  },
];

export const CARDIO_ROTATION: Record<number, string[]> = {
  1: ['CARDIO_1', 'CARDIO_2'],
  2: ['CARDIO_3', 'CARDIO_4'],
  3: ['CARDIO_5', 'CARDIO_6'],
  4: ['CARDIO_7', 'CARDIO_8'],
};
