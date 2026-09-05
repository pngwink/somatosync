import type { ReactionQuality } from "./reactionTypes";
import { MIN_VALID_TRIALS_FOR_RESULT } from "./reactionTypes";

export interface QualityInput {
  validTrialCount: number;
  falseStarts: number;
  focusLossCount: number;
  coefficientOfVariation: number | null;
  abandoned: boolean;
}

export interface QualityEvaluation {
  quality: ReactionQuality;
  reasons: string[];
}

// Transparent, rule-based test-quality rating. Kept as a standalone utility
// (not inline JSX) so the rules are easy to read, test, and adjust as this
// becomes the shared quality model for future assessment types.
const HIGH_MAX_CV = 15;
const MODERATE_MAX_CV = 25;

export function evaluateReactionQuality(input: QualityInput): QualityEvaluation {
  const { validTrialCount, falseStarts, focusLossCount, coefficientOfVariation, abandoned } = input;

  if (abandoned) {
    return { quality: "invalid", reasons: ["the assessment was not completed"] };
  }

  if (validTrialCount < MIN_VALID_TRIALS_FOR_RESULT) {
    return {
      quality: "invalid",
      reasons: [`fewer than ${MIN_VALID_TRIALS_FOR_RESULT} valid scored trials were recorded (${validTrialCount} valid)`],
    };
  }

  const highVariability = coefficientOfVariation != null && coefficientOfVariation > MODERATE_MAX_CV;
  const moderateVariability = coefficientOfVariation != null && coefficientOfVariation > HIGH_MAX_CV;

  const isHigh = validTrialCount >= 9 && focusLossCount === 0 && falseStarts === 0 && !moderateVariability;
  if (isHigh) {
    return { quality: "high", reasons: ["at least nine valid trials, no interruptions, and low variability"] };
  }

  const isModerate = validTrialCount >= 8 && falseStarts <= 1 && focusLossCount <= 1 && !highVariability;
  if (isModerate) {
    const reasons: string[] = [];
    if (falseStarts === 1) reasons.push("one false start");
    if (focusLossCount === 1) reasons.push("one browser focus interruption");
    if (moderateVariability) reasons.push("moderate trial variability");
    if (reasons.length === 0) reasons.push("eight or more valid trials with only minor variability");
    return { quality: "moderate", reasons };
  }

  // Anything with at least the minimum valid trials but that didn't qualify
  // above is "limited" rather than invalid.
  const reasons: string[] = [];
  if (falseStarts > 1) reasons.push(`${falseStarts} false starts`);
  if (focusLossCount > 1) reasons.push(`the browser lost focus ${focusLossCount} times`);
  if (highVariability) reasons.push("high trial variability");
  if (validTrialCount < 9) reasons.push(`only ${validTrialCount} valid trials`);
  if (reasons.length === 0) reasons.push("test conditions were not ideal");

  return { quality: "limited", reasons };
}

export function formatQualityReasonSentence(quality: ReactionQuality, reasons: string[]): string {
  const label = quality.charAt(0).toUpperCase() + quality.slice(1);
  if (reasons.length === 0) return `Quality: ${label}.`;
  return `Quality: ${label} because ${reasons.join(" and ")}.`;
}
