export type SCExercise = {
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
};

export type SCTemplate = {
  id: string;
  name: string;
  focus: string;
  level: 'Intermediate';
  duration: string;
  tags: string[];
  exercises: SCExercise[];
};

const REST = '60–90 sec';

export const SC_TEMPLATES: SCTemplate[] = [
  {
    id: 'upper-push',
    name: 'Upper Body — Push',
    focus: 'Chest, Shoulders, Triceps',
    level: 'Intermediate',
    duration: '45–60 min',
    tags: ['Strength', 'Push'],
    exercises: [
      { name: 'Dumbbell Bench Press', equipment: 'Dumbbells', sets: 4, reps: '8–12', rest: REST },
      { name: 'Incline Dumbbell Press', equipment: 'Dumbbells', sets: 4, reps: '8–12', rest: REST },
      { name: 'Overhead Shoulder Press', equipment: 'Barbell or Dumbbells', sets: 4, reps: '8–12', rest: REST },
      { name: 'Dumbbell Lateral Raises', equipment: 'Dumbbells', sets: 4, reps: '8–12', rest: REST },
      { name: 'Triceps Dips / Cable Pushdown', equipment: 'Bodyweight or Cable', sets: 4, reps: '8–12', rest: REST },
    ],
  },
  {
    id: 'upper-pull',
    name: 'Upper Body — Pull',
    focus: 'Back, Rear Delts, Biceps',
    level: 'Intermediate',
    duration: '45–60 min',
    tags: ['Strength', 'Pull'],
    exercises: [
      { name: 'Pull Ups (or Assisted)', equipment: 'Bodyweight', sets: 4, reps: '8–12', rest: REST },
      { name: 'Barbell Bent Over Row', equipment: 'Barbell', sets: 4, reps: '8–12', rest: REST },
      { name: 'Single Arm Dumbbell Row', equipment: 'Dumbbell', sets: 4, reps: '8–12', rest: REST },
      { name: 'Face Pulls', equipment: 'Cable or Band', sets: 4, reps: '8–12', rest: REST },
      { name: 'Dumbbell Biceps Curl', equipment: 'Dumbbells', sets: 4, reps: '8–12', rest: REST },
    ],
  },
  {
    id: 'lower-strength',
    name: 'Lower Body — Strength',
    focus: 'Quads, Hamstrings, Glutes, Calves',
    level: 'Intermediate',
    duration: '45–60 min',
    tags: ['Strength', 'Legs'],
    exercises: [
      { name: 'Barbell Back Squat', equipment: 'Barbell', sets: 4, reps: '6–10', rest: REST },
      { name: 'Romanian Deadlift', equipment: 'Barbell or Dumbbells', sets: 4, reps: '6–10', rest: REST },
      { name: 'Walking Lunges', equipment: 'Dumbbells', sets: 4, reps: '6–10', rest: REST },
      { name: 'Leg Press', equipment: 'Machine', sets: 4, reps: '6–10', rest: REST },
      { name: 'Standing Calf Raises', equipment: 'Dumbbells or Machine', sets: 4, reps: '6–10', rest: REST },
    ],
  },
  {
    id: 'full-body-power',
    name: 'Full Body — Power & Athletic',
    focus: 'Explosive Power, Conditioning',
    level: 'Intermediate',
    duration: '45–60 min',
    tags: ['Conditioning', 'Full'],
    exercises: [
      { name: 'Kettlebell Swings', equipment: 'Kettlebell', sets: 4, reps: '8–12 (explosive)', rest: REST },
      { name: 'Dumbbell Thrusters', equipment: 'Dumbbells', sets: 4, reps: '8–12 (explosive)', rest: REST },
      { name: 'Box Jumps / Jump Squats', equipment: 'Box or Bodyweight', sets: 4, reps: '8–12 (explosive)', rest: REST },
      { name: 'Push Press', equipment: 'Barbell', sets: 4, reps: '8–12 (explosive)', rest: REST },
      { name: 'Medicine Ball Slams', equipment: 'Med Ball', sets: 4, reps: '8–12 (explosive)', rest: REST },
    ],
  },
  {
    id: 'core-stability',
    name: 'Core & Stability',
    focus: 'Core Strength, Anti-Rotation',
    level: 'Intermediate',
    duration: '45–60 min',
    tags: ['Conditioning', 'Core'],
    exercises: [
      { name: 'Plank Hold', equipment: 'Bodyweight', sets: 4, reps: '30–60 sec', rest: REST },
      { name: 'Hanging Knee Raises', equipment: 'Pull-up Bar', sets: 4, reps: '12–15', rest: REST },
      { name: 'Russian Twists (Weighted)', equipment: 'Dumbbell or Plate', sets: 4, reps: '12–15', rest: REST },
      { name: 'Dead Bug', equipment: 'Bodyweight', sets: 4, reps: '12–15', rest: REST },
      { name: 'Cable Woodchopper', equipment: 'Cable', sets: 4, reps: '12–15', rest: REST },
    ],
  },
];
