import type { AdaptiveCheckIn } from "../adaptive/neuroAdaptiveTypes";
import type { RelayAudience, RelayFeedbackResponse } from "../relay/relayTypes";

export type AdaptiveResponseOutcome = "pending" | "appeared-helpful" | "no-clear-change" | "strain-increased" | "reverted" | "not-enough-data";

export interface AdaptiveResponseEvent {
  id: string;
  kind: "adaptive-response";
  startedAt: string;
  completedAt?: string;
  contexts: string[];
  checkIn: AdaptiveCheckIn;
  triggerReasons: string[];
  changes: string[];
  beforeStrainScore: number | null;
  afterStrainScore: number | null;
  outcome: AdaptiveResponseOutcome;
  source: "site-wide" | "guided-session";
}

export interface ManualContextEvent {
  id: string;
  kind: "context-note";
  completedAt: string;
  contexts: string[];
  note?: string;
}

export interface CaregiverFeedbackEvent {
  id: string;
  kind: "caregiver-feedback";
  completedAt: string;
  audience: RelayAudience;
  shareId: string;
  responses: RelayFeedbackResponse[];
}

export type RecoveryMemoryEvent = AdaptiveResponseEvent | ManualContextEvent | CaregiverFeedbackEvent;

export interface SupportPattern {
  id: string;
  title: string;
  detail: string;
  helpfulCount: number;
  observedCount: number;
  undoneCount?: number;
}

export interface RecoveryStoryItem {
  id: string;
  completedAt: string;
  title: string;
  detail: string;
  contexts?: string[];
  tone?: "neutral" | "positive" | "caution";
}
