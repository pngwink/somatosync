import { describe, it, expect, beforeEach } from "vitest";

// Minimal in-memory localStorage stub -- avoids pulling in jsdom just for
// these tests, per the project's "no large new test dependency" guidance.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  localStorage.setItem("somatosync.session.mode.v1", "user");
  localStorage.setItem("somatosync.session.userId.v1", "test-user");
});

import {
  loadReactionHistory,
  saveReactionResult,
  getMostRecentReactionResult,
  getPreviousReactionResult,
  getReactionBaseline,
} from "./reactionStorage";
import type { ReactionAssessmentResult } from "./reactionTypes";
import { EMPTY_SYMPTOM_RATINGS } from "./reactionTypes";

const HISTORY_KEY = "somatosync.user-test-user.assessments.reaction.v2";

function makeResult(overrides: Partial<ReactionAssessmentResult>): ReactionAssessmentResult {
  return {
    id: "r1",
    assessmentType: "reaction-time",
    schemaVersion: 1,
    startedAt: "2026-07-20T09:00:00.000Z",
    completedAt: "2026-07-20T09:03:00.000Z",
    durationMs: 180000,
    deviceType: "desktop",
    preSymptoms: EMPTY_SYMPTOM_RATINGS,
    postSymptoms: EMPTY_SYMPTOM_RATINGS,
    sleepHours: 7,
    recentCaffeine: false,
    feelsAbleToTest: true,
    trials: [],
    validReactionTimesMs: [300, 310, 290, 305, 295, 300, 310],
    medianMs: 300,
    meanMs: 301,
    standardDeviationMs: 7,
    fastestMs: 290,
    slowestMs: 310,
    interquartileRangeMs: 10,
    coefficientOfVariation: 2.3,
    baselineMs: null,
    baselineSource: "personal",
    baselineDifferenceMs: null,
    baselineDifferencePercent: null,
    previousAssessmentDifferencePercent: null,
    falseStarts: 0,
    invalidTrials: 0,
    missedTrials: 0,
    focusLossCount: 0,
    quality: "high",
    qualityReasons: ["clean session"],
    ...overrides,
  };
}

describe("loadReactionHistory", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadReactionHistory()).toEqual([]);
  });

  it("recovers gracefully from malformed JSON", () => {
    localStorage.setItem(HISTORY_KEY, "{not valid json");
    expect(loadReactionHistory()).toEqual([]);
  });

  it("filters out entries that don't look like a reaction result", () => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([{ garbage: true }, makeResult({ id: "good" })])
    );
    const history = loadReactionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("good");
  });

  it("returns an empty array if the stored value isn't an array at all", () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ not: "an array" }));
    expect(loadReactionHistory()).toEqual([]);
  });
});

describe("saveReactionResult", () => {
  it("saves a result and makes it retrievable as the most recent", () => {
    saveReactionResult(makeResult({ id: "a", completedAt: "2026-07-20T09:00:00.000Z" }));
    expect(getMostRecentReactionResult()?.id).toBe("a");
  });

  it("does not overwrite existing history when adding a new result", () => {
    saveReactionResult(makeResult({ id: "a", completedAt: "2026-07-20T09:00:00.000Z" }));
    saveReactionResult(makeResult({ id: "b", completedAt: "2026-07-21T09:00:00.000Z" }));
    expect(loadReactionHistory()).toHaveLength(2);
  });

  it("prevents duplicate saves of the same id", () => {
    saveReactionResult(makeResult({ id: "a" }));
    saveReactionResult(makeResult({ id: "a" }));
    expect(loadReactionHistory()).toHaveLength(1);
  });

  it("sorts newest first regardless of insertion order", () => {
    saveReactionResult(makeResult({ id: "old", completedAt: "2026-07-18T09:00:00.000Z" }));
    saveReactionResult(makeResult({ id: "new", completedAt: "2026-07-25T09:00:00.000Z" }));
    const history = loadReactionHistory();
    expect(history[0].id).toBe("new");
    expect(history[1].id).toBe("old");
  });
});

describe("getMostRecentReactionResult / getPreviousReactionResult", () => {
  it("returns null for both when no history exists", () => {
    expect(getMostRecentReactionResult()).toBeNull();
    expect(getPreviousReactionResult()).toBeNull();
  });

  it("returns the two newest results in order", () => {
    saveReactionResult(makeResult({ id: "1", completedAt: "2026-07-10T09:00:00.000Z" }));
    saveReactionResult(makeResult({ id: "2", completedAt: "2026-07-20T09:00:00.000Z" }));
    saveReactionResult(makeResult({ id: "3", completedAt: "2026-07-25T09:00:00.000Z" }));
    expect(getMostRecentReactionResult()?.id).toBe("3");
    expect(getPreviousReactionResult()?.id).toBe("2");
  });
});

describe("account isolation and starting assessment", () => {
  it("uses the first saved result as the starting point for later comparisons", () => {
    expect(getReactionBaseline().baselineMs).toBeNull();
    saveReactionResult(makeResult({ id: "first", medianMs: 340 }));
    expect(getReactionBaseline().baselineMs).toBe(340);
  });

  it("keeps another user's history separate", () => {
    saveReactionResult(makeResult({ id: "user-a" }));
    expect(loadReactionHistory()).toHaveLength(1);

    localStorage.setItem("somatosync.session.userId.v1", "another-user");
    expect(loadReactionHistory()).toEqual([]);
  });
});
