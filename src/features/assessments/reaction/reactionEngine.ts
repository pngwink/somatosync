import type { ReactionTrialResult, ReactionTrialStatus, ReactionTrialKind } from "./reactionTypes";
import { ANTICIPATORY_THRESHOLD_MS, DELAYED_THRESHOLD_MS } from "./reactionTypes";

// Small, pure, timing-adjacent helpers kept separate from the stateful hook
// so the classification rules can be unit tested without mounting React.

export function randomStimulusDelay(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

export function classifyResponse(reactionTimeMs: number): ReactionTrialStatus {
  if (reactionTimeMs < ANTICIPATORY_THRESHOLD_MS) return "anticipatory";
  if (reactionTimeMs <= DELAYED_THRESHOLD_MS) return "valid";
  return "delayed";
}

/** Plain-language, non-judgmental feedback text. Scored feedback never reveals timing quality. */
export function describeTrialFeedback(status: ReactionTrialStatus, kind: ReactionTrialKind): string {
  if (kind === "practice") {
    switch (status) {
      case "valid":
        return "Valid response.";
      case "false-start":
      case "anticipatory":
        return "Too early. Wait for the stimulus to change before responding.";
      case "delayed":
        return "Recorded, but later than expected.";
      case "missed":
        return "Missed stimulus. No response was recorded in time.";
      case "focus-interrupted":
        return "Test conditions may have affected this trial.";
    }
  }
  switch (status) {
    case "valid":
    case "delayed":
      return "Response recorded.";
    case "false-start":
    case "anticipatory":
      return "Response recorded before the stimulus appeared.";
    case "missed":
      return "No response recorded in time.";
    case "focus-interrupted":
      return "Test conditions may have affected this trial.";
  }
}

export function buildTrial(params: {
  trialNumber: number;
  kind: ReactionTrialKind;
  scheduledDelayMs: number;
  startedAt: string;
  status: ReactionTrialStatus;
  reactionTimeMs: number | null;
  stimulusShownAt: number | null;
  respondedAt: number | null;
  focusLost: boolean;
}): ReactionTrialResult {
  return {
    id: `${params.kind}-${params.trialNumber}-${params.startedAt}`,
    trialNumber: params.trialNumber,
    phase: params.kind,
    scheduledDelayMs: params.scheduledDelayMs,
    reactionTimeMs: params.reactionTimeMs,
    status: params.status,
    startedAt: params.startedAt,
    stimulusShownAt: params.stimulusShownAt,
    respondedAt: params.respondedAt,
    focusLost: params.focusLost,
  };
}
