import type { ReactionAssessmentResult } from "./reactionTypes";
import { EMPTY_SYMPTOM_RATINGS } from "./reactionTypes";
import { compareToReference, computeTrialStats } from "./reactionCalculations";
import { evaluateReactionQuality } from "./reactionQuality";
import { clearDemoReactionData, hasDemoReactionData, loadDemoReactionHistory } from "./reactionStorage";

// Fixed sample history for Maya Chen's isolated demo profile.

function buildScoredTrials(targetMedianMs: number, spreadMs: number): number[] {
  const offsets = [-2 * spreadMs, -1.4 * spreadMs, -0.6 * spreadMs, -0.2 * spreadMs, 0, 0.2 * spreadMs, 0.5 * spreadMs, 1 * spreadMs, 1.6 * spreadMs];
  return offsets.map((offset) => Math.max(120, Math.round(targetMedianMs + offset)));
}

function buildDemoSession(
  dateIso: string,
  targetMedianMs: number,
  spreadMs: number,
  idSuffix: string,
  startingMedianMs: number | null,
  previousMedianMs: number | null
): ReactionAssessmentResult {
  const times = buildScoredTrials(targetMedianMs, spreadMs);
  const trials = times.map((reactionTimeMs, index) => ({
    id: `demo-${idSuffix}-scored-${index + 1}`,
    trialNumber: index + 1,
    phase: "scored" as const,
    scheduledDelayMs: 2000 + index * 150,
    reactionTimeMs,
    status: "valid" as const,
    startedAt: dateIso,
    stimulusShownAt: 0,
    respondedAt: reactionTimeMs,
    focusLost: false,
  }));

  const stats = computeTrialStats(trials);
  const { quality, reasons } = evaluateReactionQuality({
    validTrialCount: stats.validReactionTimesMs.length,
    falseStarts: stats.falseStarts,
    focusLossCount: stats.focusLossCount,
    coefficientOfVariation: stats.coefficientOfVariation,
    abandoned: false,
  });
  const startingComparison = compareToReference(stats.medianMs, startingMedianMs);
  const previousComparison = compareToReference(stats.medianMs, previousMedianMs);

  return {
    id: `demo-reaction-${idSuffix}`,
    assessmentType: "reaction-time",
    schemaVersion: 1,
    startedAt: dateIso,
    completedAt: dateIso,
    durationMs: 3 * 60 * 1000,
    deviceType: "desktop",
    preSymptoms: EMPTY_SYMPTOM_RATINGS,
    postSymptoms: EMPTY_SYMPTOM_RATINGS,
    sleepHours: 7,
    recentCaffeine: false,
    feelsAbleToTest: true,
    trials,
    validReactionTimesMs: stats.validReactionTimesMs,
    medianMs: stats.medianMs,
    meanMs: stats.meanMs,
    standardDeviationMs: stats.standardDeviationMs,
    fastestMs: stats.fastestMs,
    slowestMs: stats.slowestMs,
    interquartileRangeMs: stats.interquartileRangeMs,
    coefficientOfVariation: stats.coefficientOfVariation,
    baselineMs: startingMedianMs,
    baselineSource: "demo",
    baselineDifferenceMs: startingComparison.differenceMs,
    baselineDifferencePercent: startingComparison.differencePercent,
    previousAssessmentDifferencePercent: previousComparison.differencePercent,
    falseStarts: stats.falseStarts,
    invalidTrials: stats.invalidTrials,
    missedTrials: stats.missedTrials,
    focusLossCount: stats.focusLossCount,
    quality,
    qualityReasons: reasons,
    isDemo: true,
  };
}

function buildDemoHistory(): ReactionAssessmentResult[] {
  const sessions = [
    { date: "2026-07-16T09:00:00.000Z", median: 402, spread: 30, id: "1" },
    { date: "2026-07-19T09:00:00.000Z", median: 368, spread: 26, id: "2" },
    { date: "2026-07-22T09:00:00.000Z", median: 341, spread: 22, id: "3" },
    { date: "2026-07-25T09:00:00.000Z", median: 318, spread: 18, id: "4" },
    { date: "2026-07-28T09:00:00.000Z", median: 299, spread: 14, id: "5" },
  ];

  const startingMedian = sessions[0].median;
  return sessions.map((session, index) =>
    buildDemoSession(
      session.date,
      session.median,
      session.spread,
      session.id,
      index === 0 ? null : startingMedian,
      index === 0 ? null : sessions[index - 1].median
    )
  );
}

export function loadReactionDemoHistory(): void {
  loadDemoReactionHistory(buildDemoHistory());
}

export { clearDemoReactionData as clearReactionDemoHistory, hasDemoReactionData };
