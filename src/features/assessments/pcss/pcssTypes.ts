export type PcssCategory = "physical" | "sleep" | "emotional" | "cognitive";

export type PcssSymptomId =
  | "headache"
  | "nausea"
  | "vomiting"
  | "balanceProblems"
  | "dizziness"
  | "fatigue"
  | "troubleFallingAsleep"
  | "sleepTooMuch"
  | "sleepTooLittle"
  | "drowsiness"
  | "sensitivityToLight"
  | "sensitivityToNoise"
  | "irritability"
  | "sadness"
  | "nervousness"
  | "moreEmotional"
  | "numbnessTingling"
  | "slowedDown"
  | "mentallyFoggy"
  | "difficultyConcentrating"
  | "memoryProblems"
  | "visualProblems";

export interface PcssSymptomDefinition {
  id: PcssSymptomId;
  label: string;
  category: PcssCategory;
}

export type PcssRatings = Record<PcssSymptomId, number>;

export interface PcssCategoryTotals {
  physical: number;
  sleep: number;
  emotional: number;
  cognitive: number;
}

export interface PcssAssessmentResult {
  id: string;
  assessmentType: "symptom-check-in";
  completedAt: string;
  ratings: PcssRatings;
  totalSeverity: number;
  symptomCount: number;
  categoryTotals: PcssCategoryTotals;
  source?: "manual" | "voice";
  activityContexts?: string[];
  isDemo?: boolean;
}
