export type UserLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
export type SessionType = 'Planned' | 'Completed';
export type Discipline = 'MMA' | 'Muay Thai' | 'K1' | 'Wrestling' | 'Grappling' | 'BJJ' | 'Strength Training' | 'Cardio Activity';
export type MartialArtsDiscipline = 'MMA' | 'Muay Thai' | 'K1' | 'Wrestling' | 'Grappling' | 'BJJ';
export type Feeling = 'Fresh' | 'Normal' | 'Tired' | 'Injured' | 'On Fire';
export type TacticalGoal = 'Attacking' | 'Defending' | 'Countering' | 'Intercepting';
export type Strategy = 'Attacking' | 'Defending' | 'Countering' | 'Intercepting' | 'Transitions' | 'Control';
export type WorkoutMode = 'manual' | 'template' | 'qr';
export type CardioType = 'Running' | 'Walking' | 'Bike' | 'Rowing' | 'AssaultBike' | 'Swimming' | 'StairClimber' | 'Hiking' | 'JumpRope' | 'Other';

export const MARTIAL_ARTS_DISCIPLINES: MartialArtsDiscipline[] = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

export function isMartialArt(discipline: Discipline): discipline is MartialArtsDiscipline {
  return MARTIAL_ARTS_DISCIPLINES.includes(discipline as MartialArtsDiscipline);
}

export type AccountType = 'free' | 'basic' | 'pro';
export type FitnessLevel = 'Beginner' | 'Moderate' | 'Active' | 'Very Active';

export interface Profile {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  level: UserLevel;
  account_type: AccountType;
  discipline?: string;
  fitness_level?: FitnessLevel;
  strength_level?: string;
  strength_program_start_date?: string;
  coach_override_enabled?: boolean;
  assigned_by_coach?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  date: string;
  time?: string;
  session_type: SessionType;
  discipline: Discipline;
  title?: string;
  intensity?: number;
  feeling?: Feeling;
  strategy?: Strategy;
  first_movement?: string;
  opponent_action?: string;
  second_movement?: string;
  notes?: string;
  // Strength Training fields
  workout_mode?: WorkoutMode;
  workout_template_id?: string;
  workout_name?: string;
  workout_type?: string;
  total_load?: number;
  total_reps?: number;
  total_sets?: number;
  total_exercises?: number;
  // Cardio fields
  cardio_activity_name?: string;
  cardio_type?: CardioType;
  duration_seconds?: number;
  distance_meters?: number;
  calories?: number;
  avg_pace_seconds_per_km?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  created_at: string;
  updated_at: string;
  technique_chains?: TechniqueChain[];
}

export interface TechniqueChain {
  id: string;
  training_session_id: string;
  discipline: MartialArtsDiscipline;
  sub_type: string;
  tactical_goal: TacticalGoal;
  starting_action: string;
  defender_reaction: string;
  continuation_finish: string;
  custom_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category?: string;
  muscle_group?: string;
  equipment?: string;
  is_custom: boolean;
  user_id?: string;
}

export interface StrengthExerciseState {
  id?: string;
  exerciseName: string;
  exerciseLibraryId?: string;
  sets: StrengthSetState[];
}

export interface StrengthSetState {
  id?: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  notes?: string;
}

export interface StrengthWorkoutTotals {
  totalLoad: number;
  totalReps: number;
  totalSets: number;
  totalExercises: number;
}
