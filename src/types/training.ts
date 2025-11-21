export type UserLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
export type SessionType = 'Planned' | 'Completed';
export type Discipline = 'MMA' | 'Muay Thai' | 'K1' | 'Wrestling' | 'Grappling' | 'BJJ';
export type Feeling = 'Fresh' | 'Normal' | 'Tired' | 'Injured' | 'On Fire';
export type TacticalGoal = 'Attacking' | 'Defending' | 'Countering' | 'Intercepting';

export interface Profile {
  id: string;
  name: string;
  email: string;
  level: UserLevel;
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
  notes?: string;
  created_at: string;
  updated_at: string;
  technique_chains?: TechniqueChain[];
}

export interface TechniqueChain {
  id: string;
  training_session_id: string;
  discipline: Discipline;
  sub_type: string;
  tactical_goal: TacticalGoal;
  starting_action: string;
  defender_reaction: string;
  continuation_finish: string;
  custom_notes?: string;
  created_at: string;
  updated_at: string;
}
