import type { ReactionTrialResult, SymptomRatings } from "./reactionTypes";
import { MIN_VALID_TRIALS_FOR_RESULT, SYMPTOM_KEYS, SYMPTOM_LABELS } from "./reactionTypes";

// Pure functions only -- no React, no storage, no DOM. Every function here
// takes plain data in and returns plain data out, so it can be unit tested
// and reused by any future assessment type that needs similar statistics.

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sample standard deviation (n-1). Returns 0 for a single value, null for none. */
export function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) return 0;
  const m = mean(values)!;
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function interquartileRange(values: number[]): number | null {
  if (values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2)));
  const q3 = median(sorted.slice(Math.ceil(sorted.length / 2)));
  if (q1 == null || q3 == null) return null;
  return q3 - q1;
}

export function coefficientOfVariation(meanMs: number | null, sdMs: number | null): number | null {
  if (meanMs == null || sdMs == null || meanMs === 0) return null;
  return (sdMs / meanMs) * 100;
}

export interface BaselineComparison {
  differenceMs: number | null;
  differencePercent: number | null;
}

/**
 * Positive differenceMs means slower than the comparison value (worse);
 * differencePercent follows the app-wide convention where negative means
 * worse and positive means better, so it can reuse the same badge coloring
 * as every other metric in SomatoSync.
 */
export function compareToReference(medianMs: number | null, referenceMs: number | null): BaselineComparison {
  if (medianMs == null || referenceMs == null || referenceMs === 0) {
    return { differenceMs: null, differencePercent: null };
  }
  const differenceMs = medianMs - referenceMs;
  const differencePercent = -(differenceMs / referenceMs) * 100;
  return { differenceMs, differencePercent };
}

export interface TrialStats {
  validReactionTimesMs: number[];
  medianMs: number | null;
  meanMs: number | null;
  standardDeviationMs: number | null;
  fastestMs: number | null;
  slowestMs: number | null;
  interquartileRangeMs: number | null;
  coefficientOfVariation: number | null;
  falseStarts: number;
  invalidTrials: number;
  missedTrials: number;
  focusLossCount: number;
  hasEnoughValidTrials: boolean;
}

/** Computes every scored-trial statistic from a finished set of scored trials. */
export function computeTrialStats(scoredTrials: ReactionTrialResult[]): TrialStats {
  const validReactionTimesMs = scoredTrials
    .filter((t) => t.status === "valid" && t.reactionTimeMs != null)
    .map((t) => t.reactionTimeMs as number);

  const falseStarts = scoredTrials.filter((t) => t.status === "false-start").length;
  const invalidTrials = scoredTrials.filter((t) => t.status === "anticipatory" || t.status === "delayed").length;
  const missedTrials = scoredTrials.filter((t) => t.status === "missed" || t.status === "focus-interrupted").length;
  const focusLossCount = scoredTrials.filter((t) => t.focusLost).length;

  const hasEnoughValidTrials = validReactionTimesMs.length >= MIN_VALID_TRIALS_FOR_RESULT;

  const meanMs = hasEnoughValidTrials ? mean(validReactionTimesMs) : null;
  const standardDeviationMs = hasEnoughValidTrials ? standardDeviation(validReactionTimesMs) : null;

  return {
    validReactionTimesMs,
    medianMs: hasEnoughValidTrials ? median(validReactionTimesMs) : null,
    meanMs,
    standardDeviationMs,
    fastestMs: hasEnoughValidTrials ? Math.min(...validReactionTimesMs) : null,
    slowestMs: hasEnoughValidTrials ? Math.max(...validReactionTimesMs) : null,
    interquartileRangeMs: hasEnoughValidTrials ? interquartileRange(validReactionTimesMs) : null,
    coefficientOfVariation: hasEnoughValidTrials ? coefficientOfVariation(meanMs, standardDeviationMs) : null,
    falseStarts,
    invalidTrials,
    missedTrials,
    focusLossCount,
    hasEnoughValidTrials,
  };
}

export interface SymptomComparison {
  totalBefore: number;
  totalAfter: number;
  change: number;
  increased: (keyof SymptomRatings)[];
  decreased: (keyof SymptomRatings)[];
  unchanged: (keyof SymptomRatings)[];
}

export function symptomTotal(ratings: SymptomRatings): number {
  return SYMPTOM_KEYS.reduce((sum, key) => sum + ratings[key], 0);
}

export function compareSymptoms(before: SymptomRatings, after: SymptomRatings): SymptomComparison {
  const increased: (keyof SymptomRatings)[] = [];
  const decreased: (keyof SymptomRatings)[] = [];
  const unchanged: (keyof SymptomRatings)[] = [];

  for (const key of SYMPTOM_KEYS) {
    if (after[key] > before[key]) increased.push(key);
    else if (after[key] < before[key]) decreased.push(key);
    else unchanged.push(key);
  }

  const totalBefore = symptomTotal(before);
  const totalAfter = symptomTotal(after);

  return { totalBefore, totalAfter, change: totalAfter - totalBefore, increased, decreased, unchanged };
}

export function symptomLabel(key: keyof SymptomRatings): string {
  return SYMPTOM_LABELS[key];
}

export function roundMs(value: number | null): number | null {
  return value == null ? null : Math.round(value);
}

export function roundPercent(value: number | null): number | null {
  return value == null ? null : Math.round(value);
}

/**
 * Produces a short, rule-based, plain-language interpretation. Deliberately
 * avoids any clinical or diagnostic language -- see the medical-boundary
 * requirements in the assessment spec this feature was built from.
 */
export function generateInterpretation(params: {
  hasEnoughValidTrials: boolean;
  medianMs: number | null;
  baselineDifferencePercent: number | null;
  baselineSource: "personal" | "demo";
  focusLossCount: number;
  quality: "high" | "moderate" | "limited" | "invalid";
}): string {
  const { hasEnoughValidTrials, medianMs, baselineDifferencePercent, baselineSource, focusLossCount, quality } = params;

  if (!hasEnoughValidTrials || medianMs == null) {
    return "This assessment cannot be interpreted reliably because fewer than seven valid trials were recorded.";
  }

  const startingLabel = baselineSource === "personal" ? "your first assessment" : "Maya's first assessment";
  let comparisonSentence: string;
  if (baselineDifferencePercent == null) {
    comparisonSentence = `Your median reaction time was ${Math.round(medianMs)} ms. This result is the starting point for future comparisons.`;
  } else if (baselineDifferencePercent < -3) {
    comparisonSentence = `Your median reaction time was ${Math.round(Math.abs(baselineDifferencePercent))}% slower than ${startingLabel}.`;
  } else if (baselineDifferencePercent > 3) {
    comparisonSentence = `Your median reaction time was ${Math.round(Math.abs(baselineDifferencePercent))}% faster than ${startingLabel}.`;
  } else {
    comparisonSentence = `Your median reaction time was close to ${startingLabel}.`;
  }

  const consistencySentence =
    quality === "high"
      ? "Trial consistency was strong."
      : quality === "moderate"
      ? "Trial consistency was moderate."
      : "Trial consistency was limited.";

  const focusSentence =
    focusLossCount > 0
      ? ` Browser focus was lost during ${focusLossCount} scored trial${focusLossCount === 1 ? "" : "s"}, which may have affected results.`
      : " Browser focus was maintained throughout the assessment.";

  return `${comparisonSentence} ${consistencySentence}${focusSentence}`;
}
