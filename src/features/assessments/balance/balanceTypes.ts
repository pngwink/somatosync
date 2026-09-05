import type { TaskToleranceRatings } from "../shared/TaskToleranceCheck";

export type BalanceMovementBand = "lower" | "moderate" | "higher" | "insufficient";

export interface BalanceFrameSample {
  timeMs: number;
  bodyX: number;
  bodyY: number;
  headX: number;
  headY: number;
  confidence?: number;
}

export interface BalanceAssessmentResult {
  id: string;
  assessmentType: "balance";
  completedAt: string;
  durationSeconds: number;
  sampleCount: number;
  trackingQualityPercent: number;
  lateralRmsPercent: number;
  lateralRangePercent: number;
  swayPathPercent: number;
  headRmsPercent: number;
  movementBand: BalanceMovementBand;
  analysisMethod?: "mediapipe-pose" | "legacy-edge-proxy";
  poseModel?: string;
  meanLandmarkVisibility?: number;
  /** Symptom response around this task; kept separate from movement performance. */
  preTolerance?: TaskToleranceRatings;
  postTolerance?: TaskToleranceRatings;
  isDemo?: boolean;
}
