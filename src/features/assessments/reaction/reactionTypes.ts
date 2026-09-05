import type { BaseAssessmentSession } from "../shared/assessmentTypes";

export type ReactionPhase =
  | "instructions"
  | "preCheck"
  | "practiceReady"
  | "waiting"
  | "stimulus"
  | "trialFeedback"
  | "scoredReady"
  | "postCheck"
  | "results";

export type ReactionTrialStatus =
  | "valid"
  | "false-start"
  | "anticipatory"
  | "delayed"
  | "missed"
  | "focus-interrupted";

export type ReactionTrialKind = "practice" | "scored";

export interface ReactionTrialResult {
  id: string;
  trialNumber: number;
  phase: ReactionTrialKind;
  scheduledDelayMs: number;
  reactionTimeMs: number | null;
  status: ReactionTrialStatus;
  startedAt: string; // ISO, when the trial's wait period began
  stimulusShownAt: number | null; // performance.now() timestamp
  respondedAt: number | null; // performance.now() timestamp
  focusLost: boolean;
}

export interface SymptomRatings {
  headache: number;
  dizziness: number;
  nausea: number;
  lightSensitivity: number;
  concentrationDifficulty: number;
  fatigue: number;
}

export const SYMPTOM_KEYS: (keyof SymptomRatings)[] = [
  "headache",
  "dizziness",
  "nausea",
  "lightSensitivity",
  "concentrationDifficulty",
  "fatigue",
];

export const SYMPTOM_LABELS: Record<keyof SymptomRatings, string> = {
  headache: "Headache",
  dizziness: "Dizziness",
  nausea: "Nausea",
  lightSensitivity: "Light sensitivity",
  concentrationDifficulty: "Difficulty concentrating",
  fatigue: "Fatigue",
};

export const EMPTY_SYMPTOM_RATINGS: SymptomRatings = {
  headache: 0,
  dizziness: 0,
  nausea: 0,
  lightSensitivity: 0,
  concentrationDifficulty: 0,
  fatigue: 0,
};

export type ReactionQuality = "high" | "moderate" | "limited" | "invalid";
export type BaselineSource = "personal" | "demo";

export interface ReactionAssessmentResult extends BaseAssessmentSession {
  assessmentType: "reaction-time";
  preSymptoms: SymptomRatings;
  postSymptoms: SymptomRatings;
  sleepHours: number | null;
  recentCaffeine: boolean | null;
  feelsAbleToTest: boolean | null;
  trials: ReactionTrialResult[];
  validReactionTimesMs: number[];
  medianMs: number | null;
  meanMs: number | null;
  standardDeviationMs: number | null;
  fastestMs: number | null;
  slowestMs: number | null;
  interquartileRangeMs: number | null;
  coefficientOfVariation: number | null;
  baselineMs: number | null;
  baselineSource: BaselineSource;
  baselineDifferenceMs: number | null;
  baselineDifferencePercent: number | null;
  previousAssessmentDifferencePercent: number | null;
  falseStarts: number;
  invalidTrials: number;
  missedTrials: number;
  focusLossCount: number;
  quality: ReactionQuality;
  qualityReasons: string[];
  /** Set only by the development-only sample-history loader; never set by a real session. */
  isDemo?: boolean;
}

export const PRACTICE_TRIAL_COUNT = 2;
export const SCORED_TRIAL_COUNT = 10;
export const MIN_VALID_TRIALS_FOR_RESULT = 7;
export const MIN_STIMULUS_DELAY_MS = 1800;
export const MAX_STIMULUS_DELAY_MS = 4500;
export const RESPONSE_TIMEOUT_MS = 3000;
export const ANTICIPATORY_THRESHOLD_MS = 100;
export const DELAYED_THRESHOLD_MS = 1500;
export const DEMO_BASELINE_MS = 270;
