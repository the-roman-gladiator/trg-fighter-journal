import { Discipline } from "@/types/training";

export const disciplines: Discipline[] = [
  'MMA',
  'Muay Thai',
  'K1',
  'Wrestling',
  'Grappling',
  'BJJ'
];

export const subTypesByDiscipline: Record<Discipline, string[]> = {
  'MMA': ['Striking MMA', 'Grappling MMA', 'BJJ MMA', 'Mixed'],
  'Muay Thai': ['Striking', 'Clinch', 'Sweeps'],
  'K1': ['Boxing / Hands', 'Kicks', 'Knees', 'Combinations'],
  'Wrestling': ['Standing (Takedowns)', 'Top Control', 'Bottom / Escapes', 'Cage Wrestling'],
  'Grappling': ['Takedowns', 'Top Game', 'Guard Game', 'Submissions'],
  'BJJ': ['Stand-up', 'Guard (Closed / Open)', 'Half Guard', 'Side Control', 'Mount', 'Back Control', 'Submissions']
};

export const tacticalGoals = ['Attacking', 'Defending', 'Countering', 'Intercepting'] as const;

export const sessionTypes = ['Planned', 'Completed'] as const;

export const feelings = ['Fresh', 'Normal', 'Tired', 'Injured', 'On Fire'] as const;

export const userLevels = ['Beginner', 'Intermediate', 'Advanced', 'Pro'] as const;

// Starting actions by discipline and subtype
export const startingActionsByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': [
    'Jab',
    'Cross',
    'Jab–Cross',
    'Lead Hook',
    'Rear Uppercut',
    'Inside Low Kick',
    'Outside Low Kick',
    'Right Body Kick',
    'Left Teep (Front Kick)',
    'Fake Jab – Cross',
    'Fake Level Change – Overhand',
    'Clinch Entry'
  ],
  'Muay Thai-Striking': [
    'Jab',
    'Cross',
    'Jab–Cross–Hook',
    'Rear Round Kick (Body)',
    'Rear Round Kick (Leg)',
    'Lead Teep',
    'Rear Teep',
    'Switch Kick'
  ],
  'Wrestling-Standing (Takedowns)': [
    'Collar Tie',
    'Underhook',
    'Double Leg Shot',
    'Single Leg Shot',
    'Body Lock',
    'Snap Down'
  ]
};

// Defender reactions by discipline and subtype
export const defenderReactionsByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': [
    'High Guard (Block)',
    'Parry Inside',
    'Parry Outside',
    'Slip Outside',
    'Slip Inside',
    'Check Low Kick',
    'Step Back / Evade',
    'Duck',
    'Clinch / Tie-up',
    'Shoot Takedown',
    'Shell Up on Cage'
  ],
  'Muay Thai-Striking': [
    'High Guard Block',
    'Long Guard',
    'Check Kick',
    'Catch Kick',
    'Step Back',
    'Clinch'
  ],
  'Wrestling-Standing (Takedowns)': [
    'Sprawl',
    'Whizzer',
    'Crossface',
    'Frame & Circle',
    'Hip Heist'
  ]
};

// Continuation/finish options by discipline and subtype
export const continuationFinishByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': [
    'Add Low Kick',
    'Add High Kick',
    'Add Body Shot',
    'Finish with Elbows',
    'Clinch & Knees',
    'Level Change – Double Leg',
    'Level Change – Single Leg',
    'Cage Takedown',
    'Ground & Pound Finish',
    'Break and Reset'
  ],
  'Muay Thai-Striking': [
    'Low Kick Finish',
    'High Kick Finish',
    'Elbows in Close',
    'Clinch & Knees',
    'Sweep',
    'Push Teep & Reset'
  ],
  'Wrestling-Standing (Takedowns)': [
    'Run the Pipe',
    'Chain to Double Leg',
    'Trip Finish',
    'Lift & Dump',
    'Go Behind / Take the Back',
    'Front Headlock to Snap Down'
  ]
};

export function getSubTypes(discipline: Discipline): string[] {
  return subTypesByDiscipline[discipline] || [];
}

export function getStartingActions(discipline: Discipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return startingActionsByDisciplineSubType[key] || ['Custom - Add Your Own'];
}

export function getDefenderReactions(discipline: Discipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return defenderReactionsByDisciplineSubType[key] || ['Custom - Add Your Own'];
}

export function getContinuationFinishes(discipline: Discipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return continuationFinishByDisciplineSubType[key] || ['Custom - Add Your Own'];
}
