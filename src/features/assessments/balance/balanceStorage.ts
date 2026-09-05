import { getActiveDataScope } from "../../../lib/session";
import type { AssessmentResult } from "../../../types";
import type { BalanceAssessmentResult } from "./balanceTypes";
import { interpretAssessmentResult } from "../shared/resultInterpretation";

const MAX_HISTORY_LENGTH = 50;

function historyKey() {
  return `somatosync.${getActiveDataScope()}.assessments.balance-camera.v1`;
}

function isBalanceResult(value: unknown): value is BalanceAssessmentResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === "string" &&
    result.assessmentType === "balance" &&
    typeof result.completedAt === "string" &&
    typeof result.lateralRmsPercent === "number" &&
    typeof result.headRmsPercent === "number" &&
    typeof result.trackingQualityPercent === "number"
  );
}

export function loadBalanceHistory(): BalanceAssessmentResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBalanceResult).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writeBalanceHistory(history: BalanceAssessmentResult[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const sorted = [...history].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    localStorage.setItem(historyKey(), JSON.stringify(sorted.slice(0, MAX_HISTORY_LENGTH)));
  } catch {
    // Keep the result visible in-session when local storage is unavailable.
  }
}

export function saveBalanceResult(result: BalanceAssessmentResult) {
  const existing = loadBalanceHistory();
  if (existing.some((entry) => entry.id === result.id)) return;
  writeBalanceHistory([result, ...existing]);
}

export function getMostRecentBalanceResult(): BalanceAssessmentResult | null {
  return loadBalanceHistory()[0] ?? null;
}

export function getStartingBalanceResult(): BalanceAssessmentResult | null {
  const history = loadBalanceHistory().sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  return history[0] ?? null;
}

export function getBalanceDashboardRow(): AssessmentResult | null {
  const latest = getMostRecentBalanceResult();
  if (!latest) return null;
  const starting = getStartingBalanceResult();
  const isFirst = !starting || starting.id === latest.id;
  const percentImproved =
    !isFirst && starting.lateralRmsPercent > 0
      ? ((starting.lateralRmsPercent - latest.lateralRmsPercent) / starting.lateralRmsPercent) * 100
      : null;

  const row: AssessmentResult = {
    id: latest.id,
    type: "balance",
    date: latest.completedAt.slice(0, 10),
    value: latest.lateralRmsPercent,
    unit: "% lateral sway",
    startingValue: isFirst ? null : starting.lateralRmsPercent,
    percentFromStart: percentImproved == null ? null : Math.round(percentImproved),
    status: "completed",
  };
  const interpretation = interpretAssessmentResult(row);
  return {
    ...row,
    interpretationLabel: interpretation.label,
    interpretationDetail: `${interpretation.detail} Current recording band: ${latest.movementBand === "lower" ? "lower movement" : latest.movementBand === "moderate" ? "moderate movement" : latest.movementBand === "higher" ? "higher movement" : "insufficient quality"}.`,
    interpretationTone: interpretation.tone,
  };
}
