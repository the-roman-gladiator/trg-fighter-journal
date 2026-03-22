// Classification Engine — BMI, Body Fat, Performance, Pathway Assignment

export type Sex = 'male' | 'female';

export type BmiClass = 'Underweight' | 'Standard Beginner' | 'Overweight' | 'Obese 1' | 'Obese 2' | 'Obese 3';
export type BodyfatClass = BmiClass;
export type PerformanceClass = 'Normal Beginner' | 'Low Capacity Beginner';
export type FinalClass = BmiClass;

export interface ClassificationResult {
  bmiValue: number;
  bmiClass: BmiClass;
  bodyfatClass: BodyfatClass | null;
  performanceClass: PerformanceClass;
  finalClass: FinalClass;
  finalEntryPath: string;
}

export interface TrainingPrescription {
  phase: string;
  weekStart: number;
  weekEnd: number;
  martialArtsPerWeek: number;
  cardioPerWeek: number;
  strengthPerWeek: number;
  description: string;
}

// ---- BMI ----
export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function classifyBmi(bmi: number): BmiClass {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Standard Beginner';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese 1';
  if (bmi < 40) return 'Obese 2';
  return 'Obese 3';
}

// ---- Body Fat ----
export function classifyBodyFat(bodyFatPercent: number, sex: Sex): BodyfatClass {
  if (sex === 'male') {
    if (bodyFatPercent < 10) return 'Underweight';
    if (bodyFatPercent <= 20) return 'Standard Beginner';
    if (bodyFatPercent <= 25) return 'Overweight';
    if (bodyFatPercent <= 30) return 'Obese 1';
    if (bodyFatPercent <= 35) return 'Obese 2';
    return 'Obese 3';
  } else {
    if (bodyFatPercent < 18) return 'Underweight';
    if (bodyFatPercent <= 30) return 'Standard Beginner';
    if (bodyFatPercent <= 35) return 'Overweight';
    if (bodyFatPercent <= 40) return 'Obese 1';
    if (bodyFatPercent <= 45) return 'Obese 2';
    return 'Obese 3';
  }
}

// ---- Performance ----
export function classifyPerformance(pushups: number, situps: number, squats: number): PerformanceClass {
  if (pushups <= 5 && situps <= 10 && squats <= 10) return 'Low Capacity Beginner';
  return 'Normal Beginner';
}

// ---- Final Classification ----
export function classify(
  weightKg: number,
  heightCm: number,
  sex: Sex,
  pushups: number,
  situps: number,
  squats: number,
  bodyFatPercent?: number | null
): ClassificationResult {
  const bmiValue = calculateBmi(weightKg, heightCm);
  const bmiClass = classifyBmi(bmiValue);
  
  let bodyfatClass: BodyfatClass | null = null;
  if (bodyFatPercent != null && bodyFatPercent > 0) {
    bodyfatClass = classifyBodyFat(bodyFatPercent, sex);
  }
  
  const performanceClass = classifyPerformance(pushups, situps, squats);
  
  // Priority: body fat > BMI
  const baseClass = bodyfatClass ?? bmiClass;
  
  // Performance modifier: if Low Capacity and classified as Standard/Underweight, 
  // they stay at their class but pathway adjusts
  const finalClass = baseClass;
  
  const perfLabel = performanceClass === 'Low Capacity Beginner' ? ' (Low Capacity)' : '';
  const finalEntryPath = `${finalClass}${perfLabel} - Beginner Pathway`;

  return {
    bmiValue: Math.round(bmiValue * 10) / 10,
    bmiClass,
    bodyfatClass,
    performanceClass,
    finalClass,
    finalEntryPath,
  };
}

// ---- Training Prescriptions by Classification ----
export function getTrainingPrescriptions(finalClass: FinalClass): TrainingPrescription[] {
  switch (finalClass) {
    case 'Underweight':
      return [{
        phase: 'Phase 1 — Build Base',
        weekStart: 1, weekEnd: 12,
        martialArtsPerWeek: 3, cardioPerWeek: 1, strengthPerWeek: 3,
        description: 'Full martial arts + 3 strength sessions to build mass and base. Light cardio optional.',
      }];
    case 'Standard Beginner':
      return [{
        phase: 'Phase 1 — Foundation',
        weekStart: 1, weekEnd: 12,
        martialArtsPerWeek: 3, cardioPerWeek: 1, strengthPerWeek: 2,
        description: 'Full martial arts + 2 strength sessions per week. Optional light cardio.',
      }];
    case 'Overweight':
      return [{
        phase: 'Phase 1 — Conditioning + Strength',
        weekStart: 1, weekEnd: 12,
        martialArtsPerWeek: 3, cardioPerWeek: 1, strengthPerWeek: 3,
        description: 'Full martial arts + 3 strength sessions + 1 cardio to improve conditioning.',
      }];
    case 'Obese 1':
      return [
        {
          phase: 'Phase 1 — Cardio Foundation',
          weekStart: 1, weekEnd: 4,
          martialArtsPerWeek: 3, cardioPerWeek: 2, strengthPerWeek: 0,
          description: 'Focus on martial arts + cardio. No strength training yet.',
        },
        {
          phase: 'Phase 2 — Add Strength',
          weekStart: 5, weekEnd: 8,
          martialArtsPerWeek: 3, cardioPerWeek: 2, strengthPerWeek: 1,
          description: 'Continue cardio, introduce 1 strength session.',
        },
        {
          phase: 'Phase 3 — Full Training',
          weekStart: 9, weekEnd: 12,
          martialArtsPerWeek: 3, cardioPerWeek: 1, strengthPerWeek: 2,
          description: 'Full training with 2-3 strength sessions.',
        },
      ];
    case 'Obese 2':
      return [
        {
          phase: 'Phase 1 — Cardio Only',
          weekStart: 1, weekEnd: 6,
          martialArtsPerWeek: 3, cardioPerWeek: 2, strengthPerWeek: 0,
          description: 'Martial arts + cardio support. Build endurance safely.',
        },
        {
          phase: 'Phase 2 — Introduce Strength',
          weekStart: 7, weekEnd: 12,
          martialArtsPerWeek: 3, cardioPerWeek: 2, strengthPerWeek: 1,
          description: 'Add 1 strength session while maintaining cardio.',
        },
      ];
    case 'Obese 3':
      return [
        {
          phase: 'Phase 1 — Safe Cardio Build',
          weekStart: 1, weekEnd: 8,
          martialArtsPerWeek: 2, cardioPerWeek: 2, strengthPerWeek: 0,
          description: 'Reduced martial arts intensity + cardio. Build base safely.',
        },
        {
          phase: 'Phase 2 — Introduce Strength',
          weekStart: 9, weekEnd: 16,
          martialArtsPerWeek: 3, cardioPerWeek: 2, strengthPerWeek: 1,
          description: 'Add 1 strength session. Gradual progression.',
        },
      ];
    default:
      return [{
        phase: 'Phase 1 — General',
        weekStart: 1, weekEnd: 12,
        martialArtsPerWeek: 3, cardioPerWeek: 1, strengthPerWeek: 2,
        description: 'Balanced beginner program.',
      }];
  }
}

// ---- Reassessment Date Calculation ----
export function getReassessmentWeeks(finalClass: FinalClass): number {
  switch (finalClass) {
    case 'Underweight':
    case 'Standard Beginner':
    case 'Overweight':
      return 12;
    case 'Obese 1':
      return 12;
    case 'Obese 2':
      return 12;
    case 'Obese 3':
      return 16;
    default:
      return 12;
  }
}

// ---- User-facing messages ----
export function getClassificationMessage(finalClass: FinalClass, performanceClass: PerformanceClass): string {
  const messages: Record<FinalClass, string> = {
    'Underweight': 'Your body needs extra strength work to build a solid base for martial arts. We\'ll prioritize strength training alongside your practice.',
    'Standard Beginner': 'Great starting point! You\'ll follow the standard beginner pathway with balanced strength and martial arts training.',
    'Overweight': 'Your pathway includes extra conditioning to build endurance alongside strength training. This will help you train harder, longer.',
    'Obese 1': 'Your body needs a preparation phase before full strength work begins. We\'ll start with cardio support and progressively add strength.',
    'Obese 2': 'This helps you train safely and improve fitness. Your pathway starts with cardio support. Strength training will begin after your preparation block.',
    'Obese 3': 'We\'ll build your fitness gradually and safely. Starting with cardio and reduced intensity, then progressively increasing as your body adapts.',
  };
  
  let msg = messages[finalClass] || messages['Standard Beginner'];
  if (performanceClass === 'Low Capacity Beginner') {
    msg += ' Your fitness assessment shows room for improvement — we\'ll make sure to progress at a safe, sustainable pace.';
  }
  return msg;
}
