import { describe, it, expect } from "vitest";
import {
  median,
  mean,
  standardDeviation,
  compareToReference,
  computeTrialStats,
  symptomTotal,
  compareSymptoms,
} from "./reactionCalculations";
import { EMPTY_SYMPTOM_RATINGS } from "./reactionTypes";
import type { ReactionTrialResult } from "./reactionTypes";

function makeTrial(overrides: Partial<ReactionTrialResult>): ReactionTrialResult {
  return {
    id: "t",
    trialNumber: 1,
    phase: "scored",
    scheduledDelayMs: 2000,
    reactionTimeMs: null,
    status: "valid",
    startedAt: new Date().toISOString(),
    stimulusShownAt: 0,
    respondedAt: 0,
    focusLost: false,
    ...overrides,
  };
}

describe("median", () => {
  it("returns the middle value for an odd-length array", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it("averages the two middle values for an even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });
});

describe("mean", () => {
  it("computes the arithmetic mean", () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
});

describe("standardDeviation", () => {
  it("returns 0 for a single value", () => {
    expect(standardDeviation([100])).toBe(0);
  });
  it("returns null for no values", () => {
    expect(standardDeviation([])).toBeNull();
  });
  it("computes sample standard deviation", () => {
    // Known result: values 2,4,4,4,5,5,7,9 -> sample stdev = 2.13809...
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(standardDeviation(values)!).toBeCloseTo(2.1381, 3);
  });
});

describe("compareToReference (starting-assessment difference)", () => {
  it("returns a negative percent when slower than the reference (worse)", () => {
    const { differenceMs, differencePercent } = compareToReference(312, 281);
    expect(differenceMs).toBeCloseTo(31, 5);
    expect(differencePercent!).toBeLessThan(0);
    expect(differencePercent!).toBeCloseTo(-11.03, 1);
  });
  it("returns a positive percent when faster than the reference (better)", () => {
    const { differencePercent } = compareToReference(250, 281);
    expect(differencePercent!).toBeGreaterThan(0);
  });
  it("returns nulls when either value is missing", () => {
    expect(compareToReference(null, 281)).toEqual({ differenceMs: null, differencePercent: null });
  });
});

describe("computeTrialStats", () => {
  it("requires at least 7 valid trials before computing a result", () => {
    const trials = Array.from({ length: 6 }, (_, i) => makeTrial({ trialNumber: i + 1, reactionTimeMs: 300, status: "valid" }));
    const stats = computeTrialStats(trials);
    expect(stats.hasEnoughValidTrials).toBe(false);
    expect(stats.medianMs).toBeNull();
  });

  it("computes stats once 7 or more valid trials exist", () => {
    const trials = Array.from({ length: 7 }, (_, i) => makeTrial({ trialNumber: i + 1, reactionTimeMs: 300 + i, status: "valid" }));
    const stats = computeTrialStats(trials);
    expect(stats.hasEnoughValidTrials).toBe(true);
    expect(stats.medianMs).not.toBeNull();
    expect(stats.validReactionTimesMs).toHaveLength(7);
  });

  it("counts false starts, invalid, and missed trials without discarding them", () => {
    const trials: ReactionTrialResult[] = [
      ...Array.from({ length: 7 }, (_, i) => makeTrial({ trialNumber: i + 1, reactionTimeMs: 300, status: "valid" })),
      makeTrial({ trialNumber: 8, status: "false-start", reactionTimeMs: null }),
      makeTrial({ trialNumber: 9, status: "missed", reactionTimeMs: null }),
      makeTrial({ trialNumber: 10, status: "anticipatory", reactionTimeMs: 40 }),
    ];
    const stats = computeTrialStats(trials);
    expect(stats.falseStarts).toBe(1);
    expect(stats.missedTrials).toBe(1);
    expect(stats.invalidTrials).toBe(1);
    expect(stats.validReactionTimesMs).toHaveLength(7);
  });
});

describe("symptom comparison", () => {
  it("totals a symptom ratings object", () => {
    expect(symptomTotal({ ...EMPTY_SYMPTOM_RATINGS, headache: 3, fatigue: 2 })).toBe(5);
  });

  it("identifies which symptoms increased and decreased", () => {
    const before = { ...EMPTY_SYMPTOM_RATINGS, headache: 1, fatigue: 3 };
    const after = { ...EMPTY_SYMPTOM_RATINGS, headache: 3, fatigue: 1 };
    const result = compareSymptoms(before, after);
    expect(result.increased).toContain("headache");
    expect(result.decreased).toContain("fatigue");
    expect(result.change).toBe(0);
  });
});
