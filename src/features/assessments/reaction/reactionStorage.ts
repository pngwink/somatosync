import type { ReactionAssessmentResult, BaselineSource } from "./reactionTypes";
import type { AssessmentResult } from "../../../types";
import { getActiveDataScope } from "../../../lib/session";
import { interpretAssessmentResult } from "../shared/resultInterpretation";

// localStorage-backed history for reaction-time assessments. Demo data and
// real-user data are stored under separate scope-specific keys.

const MAX_HISTORY_LENGTH = 50;

function historyKey(): string {
  return `somatosync.${getActiveDataScope()}.assessments.reaction.v2`;
}

function startingPointKey(): string {
  return `somatosync.${getActiveDataScope()}.starting-point.reaction.v1`;
}

function isPlausibleReactionResult(value: unknown): value is ReactionAssessmentResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.assessmentType === "reaction-time" &&
    typeof r.completedAt === "string" &&
    Array.isArray(r.trials) &&
    Array.isArray(r.validReactionTimesMs) &&
    typeof r.quality === "string"
  );
}

/** Safely reads and validates history for the active account scope. */
export function loadReactionHistory(): ReactionAssessmentResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlausibleReactionResult);
  } catch {
    return [];
  }
}

function writeReactionHistory(history: ReactionAssessmentResult[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const sorted = [...history].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    localStorage.setItem(historyKey(), JSON.stringify(sorted.slice(0, MAX_HISTORY_LENGTH)));
  } catch {
    // A completed result can still be displayed in-session when storage fails.
  }
}

/** Appends one completed result without touching another account's history. */
export function saveReactionResult(result: ReactionAssessmentResult): void {
  const existing = loadReactionHistory();
  if (existing.some((r) => r.id === result.id)) return;
  writeReactionHistory([result, ...existing]);
}

export function getMostRecentReactionResult(): ReactionAssessmentResult | null {
  const all = loadReactionHistory().sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return all[0] ?? null;
}

export function getPreviousReactionResult(): ReactionAssessmentResult | null {
  const all = loadReactionHistory().sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  return all[1] ?? null;
}

export function getPreviousReactionMedianBeforeSaving(): number | null {
  return getMostRecentReactionResult()?.medianMs ?? null;
}

export interface ReactionBaseline {
  baselineMs: number | null;
  source: BaselineSource;
}

/**
 * The first valid assessment is the starting point for later comparisons.
 * A brand-new user therefore receives no comparison on their first result.
 */
export function getReactionBaseline(): ReactionBaseline {
  const source: BaselineSource = getActiveDataScope() === "demo" ? "demo" : "personal";
  const oldestValid = loadReactionHistory()
    .filter((result) => result.medianMs != null)
    .sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1))[0];

  if (oldestValid?.medianMs != null) {
    return { baselineMs: oldestValid.medianMs, source };
  }

  // Retained only as a migration seam for any explicitly saved old value.
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(startingPointKey());
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) return { baselineMs: parsed, source };
    } catch {
      // Ignore malformed or unavailable storage.
    }
  }

  return { baselineMs: null, source };
}

/** Stores an imported starting result, if a future onboarding flow supports one. */
export function savePersonalReactionBaseline(startingMs: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(startingPointKey(), String(startingMs));
  } catch {
    // Non-critical in this frontend prototype.
  }
}

/** Maps the latest interpretable result into the dashboard table shape. */
export function getReactionDashboardRow(): AssessmentResult | null {
  const latest = getMostRecentReactionResult();
  if (!latest || latest.medianMs == null) return null;
  const row: AssessmentResult = {
    id: latest.id,
    type: "reaction-time",
    date: latest.completedAt.slice(0, 10),
    value: Math.round(latest.medianMs),
    unit: "ms",
    startingValue: latest.baselineMs == null ? null : Math.round(latest.baselineMs),
    percentFromStart:
      latest.baselineDifferencePercent == null ? null : Math.round(latest.baselineDifferencePercent),
    status: "completed",
  };
  const interpretation = interpretAssessmentResult(row);
  return {
    ...row,
    interpretationLabel: interpretation.label,
    interpretationDetail: interpretation.detail,
    interpretationTone: interpretation.tone,
  };
}

export function clearDemoReactionData(): void {
  if (getActiveDataScope() !== "demo") return;
  writeReactionHistory([]);
}

export function hasDemoReactionData(): boolean {
  return getActiveDataScope() === "demo" && loadReactionHistory().some((r) => r.isDemo);
}

/** Replaces the isolated demo history without touching any real-user scope. */
export function loadDemoReactionHistory(entries: ReactionAssessmentResult[]): void {
  if (getActiveDataScope() !== "demo") return;
  writeReactionHistory(entries.map((entry) => ({ ...entry, isDemo: true })));
}
