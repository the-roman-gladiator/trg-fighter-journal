import { MartialArtsDiscipline } from "@/types/training";

export const disciplines: MartialArtsDiscipline[] = [
  'MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'
];

export const martialArtsDisciplines: MartialArtsDiscipline[] = [
  'MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'
];

export const sessionTypes = ['Planned', 'Completed'] as const;
export const feelings = ['Fresh', 'Normal', 'Tired', 'Injured', 'On Fire'] as const;
export const userLevels = ['Beginner', 'Intermediate', 'Advanced', 'Pro'] as const;
export const strategies = ['Attacking', 'Defending', 'Countering', 'Intercepting', 'Transitions', 'Control'] as const;

export const techniquesByDiscipline: Record<MartialArtsDiscipline, string[]> = {
  'MMA': [
    // Striking
    'Jab', 'Cross', 'Hook', 'Uppercut', 'Overhand', 'Double Jab', 'Jab Cross', 'Jab Hook', 'Cross Hook',
    'Pull Counter', 'Slip Counter', 'Body Shot', 'Head Kick', 'Body Kick', 'Low Kick', 'Calf Kick',
    'Teep', 'Switch Kick', 'Superman Punch', 'Flying Knee', 'Knee', 'Elbow',
    'Spinning Back Fist', 'Spinning Elbow',
    // Clinch
    'Clinch Entry', 'Collar Tie', 'Double Collar Tie', 'Frame', 'Pummel', 'Underhook', 'Overhook',
    'Knee from Clinch', 'Elbow from Clinch', 'Clinch Turn', 'Clinch Exit',
    // Wrestling
    'Level Change', 'Penetration Step', 'Double Leg', 'Single Leg', 'High Crotch', 'Body Lock',
    'Blast Double', 'Snatch Single', 'Running the Pipe', 'Switch to Double',
    'Inside Leg Trip', 'Outside Trip', 'Foot Sweep', 'Snap Down', 'Front Headlock',
    'Mat Return', 'Cage Takedown', 'Wall Control', 'Sprawl',
    // Grappling / BJJ
    'Guard Pull', 'Closed Guard', 'Open Guard', 'Half Guard', 'Butterfly Guard',
    'De La Riva', 'X Guard', 'Guard Pass', 'Knee Cut', 'Torreando', 'Smash Pass',
    'Side Control', 'Knee on Belly', 'Mount', 'Back Control', 'Back Take',
    'Escape', 'Bridge Escape', 'Shrimp Escape', 'Sweep', 'Technical Stand Up',
    'Armbar', 'Triangle', 'Kimura', 'Americana', 'Guillotine', 'Rear Naked Choke',
    'Anaconda', "D'Arce", 'Leg Lock Entry', 'Heel Hook', 'Straight Ankle Lock',
    'Ground and Pound',
  ],
  'Muay Thai': [
    'Jab', 'Cross', 'Hook', 'Uppercut', 'Double Jab',
    'Teep', 'Rear Teep', 'Low Kick', 'Body Kick', 'Head Kick',
    'Knee', 'Straight Knee', 'Jump Knee',
    'Elbow', 'Horizontal Elbow', 'Upward Elbow',
    'Clinch Entry', 'Double Collar Tie', 'Long Guard',
    'Check', 'Catch and Counter', 'Sweep', 'Frame Exit', 'Angle Step',
  ],
  'K1': [
    'Jab', 'Cross', 'Hook', 'Uppercut',
    'Teep', 'Low Kick', 'Body Kick', 'Head Kick', 'Knee',
    'Check', 'Catch and Counter', 'Sweep', 'Angle Step', 'Frame Exit',
  ],
  'Wrestling': [
    'Stance', 'Hand Fighting', 'Level Change', 'Penetration Step',
    'Double Leg', 'Single Leg', 'High Crotch',
    'Snap Down', 'Front Headlock', 'Arm Drag', 'Duck Under',
    'Body Lock', 'Underhook', 'Overhook',
    'Mat Return', 'Switch', 'Stand Up', 'Sit Out', 'Sprawl',
    'Inside Trip', 'Outside Trip',
  ],
  'Grappling': [
    'Double Leg', 'Single Leg', 'Inside Leg Trip', 'Outside Trip',
    'Body Lock Takedown', 'Snap Down', 'Front Headlock', 'Arm Drag', 'Duck Under',
    'Underhook', 'Overhook', 'Sprawl',
    'Guard Pass', 'Knee Cut', 'Torreando',
    'Half Guard', 'Side Control', 'Mount', 'Back Take',
    'Escape', 'Sweep',
    'Guillotine', 'Kimura', 'Rear Naked Choke',
  ],
  'BJJ': [
    'Closed Guard', 'Open Guard', 'Half Guard', 'Butterfly Guard', 'Spider Guard',
    'De La Riva', 'X Guard', 'Guard Pull',
    'Sweep', 'Hip Bump Sweep', 'Scissor Sweep', 'Flower Sweep',
    'Armbar', 'Triangle', 'Omoplata', 'Kimura', 'Guillotine',
    'Rear Naked Choke', 'Bow and Arrow', 'Ezekiel', 'Americana',
    'Guard Pass', 'Knee Cut', 'Torreando',
    'Side Control', 'Mount', 'Back Control',
    'Escape', 'Technical Stand Up',
  ],
};

export function getTechniques(discipline: MartialArtsDiscipline): string[] {
  return techniquesByDiscipline[discipline] || [];
}

// Keep legacy exports for backward compatibility
export const subTypesByDiscipline: Record<MartialArtsDiscipline, string[]> = {
  'MMA': ['Striking MMA', 'Grappling MMA', 'BJJ MMA', 'Mixed'],
  'Muay Thai': ['Striking', 'Clinch', 'Sweeps'],
  'K1': ['Boxing / Hands', 'Kicks', 'Knees', 'Combinations'],
  'Wrestling': ['Standing (Takedowns)', 'Top Control', 'Bottom / Escapes', 'Cage Wrestling'],
  'Grappling': ['Takedowns', 'Top Game', 'Guard Game', 'Submissions'],
  'BJJ': ['Stand-up', 'Guard (Closed / Open)', 'Half Guard', 'Side Control', 'Mount', 'Back Control', 'Submissions']
};

export const tacticalGoals = ['Attacking', 'Defending', 'Countering', 'Intercepting'] as const;

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
