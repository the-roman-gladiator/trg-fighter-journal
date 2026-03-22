import { Discipline, MartialArtsDiscipline, CardioType } from "@/types/training";

export const disciplines: Discipline[] = [
  'MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ', 'Strength Training', 'Cardio Activity'
];

export const martialArtsDisciplines: MartialArtsDiscipline[] = [
  'MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'
];

export const subTypesByDiscipline: Record<MartialArtsDiscipline, string[]> = {
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
export const strategies = ['Attacking', 'Defending', 'Countering', 'Intercepting', 'Transitions', 'Control'] as const;

export const cardioTypes: CardioType[] = [
  'Running', 'Walking', 'Bike', 'Rowing', 'AssaultBike', 'Swimming', 'StairClimber', 'Hiking', 'JumpRope', 'Other'
];

export const firstMovementsByDiscipline: Record<MartialArtsDiscipline, string[]> = {
  'MMA': ['Jab','Cross','Jab–Cross','Lead Hook','Inside Low Kick','Low Kick','Right Body Kick','Lead Teep','Lead Hand Fake','Level Change Feint','Overhand Right','Double-Leg Shot','Single-Leg Shot','Clinch Entry'],
  'Muay Thai': ['Jab','Cross','Lead Teep','Rear Teep','Rear Round House Kick (Body)','Rear Round Kick (Leg)','Switch Kick','Lead Hand Fake','Level Change Feint','Clinch Entry'],
  'K1': ['Jab','Cross','Jab–Cross–Hook','Inside Low Kick','Outside Low Kick','Body Round Kick','Step-In Knee','Jab–Low Kick','Cross–High Kick','Lead Hand Fake','Level Change Feint'],
  'Wrestling': ['Stance & Motion','Level Change','Collar Tie','Underhook','Double-Leg','Single-Leg','Snap Down','Sprawl','Body Lock Entry','Whizzer Grip','50/50 Clinch','Lead Hand Fake','Level Change Feint'],
  'Grappling': ['Guard Pull','Arm Drag','Snap Down','Single-Leg from Tie-Up','Ankle Pick','Front Headlock Entry','Sit-Out / Sit-Through','Seated Guard Entry','Lead Hand Fake','Level Change Feint'],
  'BJJ': ['Closed Guard Pull','Open Guard Pull','Takedown Grip Fight','Sitting Guard Entry','Half Guard Entry','De La Riva Entry','Technical Stand-Up','Hip Escape from Bottom']
};

export function getFirstMovements(discipline: MartialArtsDiscipline): string[] {
  return firstMovementsByDiscipline[discipline] || [];
}

// Starting actions by discipline and subtype
export const startingActionsByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': ['Jab','Cross','Jab–Cross','Lead Hook','Rear Uppercut','Inside Low Kick','Outside Low Kick','Right Body Kick','Left Teep (Front Kick)','Fake Jab – Cross','Fake Level Change – Overhand','Clinch Entry'],
  'Muay Thai-Striking': ['Jab','Cross','Jab–Cross–Hook','Rear Round Kick (Body)','Rear Round Kick (Leg)','Lead Teep','Rear Teep','Switch Kick'],
  'Wrestling-Standing (Takedowns)': ['Collar Tie','Underhook','Double Leg Shot','Single Leg Shot','Body Lock','Snap Down']
};

export const defenderReactionsByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': ['High Guard (Block)','Parry Inside','Parry Outside','Slip Outside','Slip Inside','Check Low Kick','Step Back / Evade','Duck','Clinch / Tie-up','Shoot Takedown','Shell Up on Cage'],
  'Muay Thai-Striking': ['High Guard Block','Long Guard','Check Kick','Catch Kick','Step Back','Clinch'],
  'Wrestling-Standing (Takedowns)': ['Sprawl','Whizzer','Crossface','Frame & Circle','Hip Heist']
};

export const continuationFinishByDisciplineSubType: Record<string, string[]> = {
  'MMA-Striking MMA': ['Add Low Kick','Add High Kick','Add Body Shot','Finish with Elbows','Clinch & Knees','Level Change – Double Leg','Level Change – Single Leg','Cage Takedown','Ground & Pound Finish','Break and Reset'],
  'Muay Thai-Striking': ['Low Kick Finish','High Kick Finish','Elbows in Close','Clinch & Knees','Sweep','Push Teep & Reset'],
  'Wrestling-Standing (Takedowns)': ['Run the Pipe','Chain to Double Leg','Trip Finish','Lift & Dump','Go Behind / Take the Back','Front Headlock to Snap Down']
};

export function getSubTypes(discipline: MartialArtsDiscipline): string[] {
  return subTypesByDiscipline[discipline] || [];
}

export function getStartingActions(discipline: MartialArtsDiscipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return startingActionsByDisciplineSubType[key] || ['Custom - Add Your Own'];
}

export function getDefenderReactions(discipline: MartialArtsDiscipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return defenderReactionsByDisciplineSubType[key] || ['Custom - Add Your Own'];
}

export function getContinuationFinishes(discipline: MartialArtsDiscipline, subType: string): string[] {
  const key = `${discipline}-${subType}`;
  return continuationFinishByDisciplineSubType[key] || ['Custom - Add Your Own'];
}
