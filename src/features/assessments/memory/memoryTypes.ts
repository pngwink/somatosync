import type { ResultTone } from "../../../types";
import type { TaskToleranceRatings } from "../shared/TaskToleranceCheck";

export interface MemoryWordList {
  id: string;
  words: string[];
}

export interface MemoryRecallScore {
  correctCount: number;
  matchedWords: string[];
  intrusionCount: number;
}

export interface MemoryAssessmentResult {
  id: string;
  assessmentType: "memory";
  completedAt: string;
  wordListId: string;
  /** Three repeated learning trials. Older saved results may not include this field. */
  immediateTrials?: number[];
  /** Sum across the three learning trials, maximum 30. */
  learningTotal?: number;
  /** Score on the third/final learning trial, maximum 10. */
  finalLearningCorrect?: number;
  /** Backward-compatible alias used by older UI and stored records. */
  immediateCorrect: number;
  delayedCorrect: number;
  /** Learning total as a percent of 30 for new records; older records used one trial. */
  immediatePercent: number;
  delayedPercent: number;
  retentionPercent: number | null;
  intrusionCount: number;
  delaySeconds: number;
  interpretationLabel: string;
  interpretationDetail: string;
  interpretationTone: ResultTone;
  /** Symptom response around this task; kept separate from memory performance. */
  preTolerance?: TaskToleranceRatings;
  postTolerance?: TaskToleranceRatings;
  isDemo?: boolean;
}
