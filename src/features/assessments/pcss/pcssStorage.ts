import { getActiveDataScope } from "../../../lib/session";
import type { AssessmentResult } from "../../../types";
import { calculatePcssSummary, createEmptyPcssRatings, pcssSymptoms } from "./pcssData";
import type { PcssAssessmentResult, PcssRatings } from "./pcssTypes";
import { interpretAssessmentResult } from "../shared/resultInterpretation";

const MAX_HISTORY_LENGTH = 60;

function historyKey() {
  return `somatosync.${getActiveDataScope()}.assessments.pcss.v1`;
}

function isPcssResult(value: unknown): value is PcssAssessmentResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === "string" &&
    result.assessmentType === "symptom-check-in" &&
    typeof result.completedAt === "string" &&
    typeof result.totalSeverity === "number" &&
    typeof result.symptomCount === "number" &&
    typeof result.ratings === "object" &&
    result.ratings !== null
  );
}

export function loadPcssHistory(): PcssAssessmentResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPcssResult).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writePcssHistory(history: PcssAssessmentResult[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const sorted = [...history].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    localStorage.setItem(historyKey(), JSON.stringify(sorted.slice(0, MAX_HISTORY_LENGTH)));
  } catch {
    // The result remains visible in the current page even if storage is blocked.
  }
}

export function savePcssAssessment(
  ratings: PcssRatings,
  options?: { source?: "manual" | "voice"; activityContexts?: string[] },
): PcssAssessmentResult {
  const sanitized = createEmptyPcssRatings();
  for (const symptom of pcssSymptoms) {
    sanitized[symptom.id] = Math.max(0, Math.min(6, Math.round(Number(ratings[symptom.id]) || 0)));
  }
  const summary = calculatePcssSummary(sanitized);
  const result: PcssAssessmentResult = {
    id: `pcss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    assessmentType: "symptom-check-in",
    completedAt: new Date().toISOString(),
    ratings: sanitized,
    source: options?.source ?? "manual",
    activityContexts: options?.activityContexts?.slice(0, 6),
    ...summary,
  };
  writePcssHistory([result, ...loadPcssHistory()]);
  return result;
}

export function getMostRecentPcssResult(): PcssAssessmentResult | null {
  return loadPcssHistory()[0] ?? null;
}

export function getStartingPcssResult(): PcssAssessmentResult | null {
  const valid = loadPcssHistory().sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  return valid[0] ?? null;
}

export function getPcssDashboardRow(): AssessmentResult | null {
  const latest = getMostRecentPcssResult();
  if (!latest) return null;
  const starting = getStartingPcssResult();
  const isFirst = !starting || starting.id === latest.id;
  const percentImproved =
    !isFirst && starting.totalSeverity > 0
      ? ((starting.totalSeverity - latest.totalSeverity) / starting.totalSeverity) * 100
      : null;

  const row: AssessmentResult = {
    id: latest.id,
    type: "symptom-check-in",
    date: latest.completedAt.slice(0, 10),
    value: latest.totalSeverity,
    unit: "of 132 severity",
    startingValue: isFirst ? null : starting.totalSeverity,
    percentFromStart: percentImproved == null ? null : Math.round(percentImproved),
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
