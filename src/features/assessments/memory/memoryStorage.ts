import { getActiveDataScope } from "../../../lib/session";
import type { AssessmentResult, ResultTone } from "../../../types";
import type { MemoryAssessmentResult } from "./memoryTypes";
import type { TaskToleranceRatings } from "../shared/TaskToleranceCheck";

const MAX_HISTORY_LENGTH = 50;

function historyKey() {
  return `somatosync.${getActiveDataScope()}.assessments.memory.v1`;
}

function isMemoryResult(value: unknown): value is MemoryAssessmentResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === "string" &&
    result.assessmentType === "memory" &&
    typeof result.completedAt === "string" &&
    typeof result.wordListId === "string" &&
    typeof result.immediateCorrect === "number" &&
    typeof result.delayedCorrect === "number" &&
    typeof result.interpretationLabel === "string"
  );
}

export function loadMemoryHistory(): MemoryAssessmentResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMemoryResult).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writeMemoryHistory(history: MemoryAssessmentResult[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const sorted = [...history].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    localStorage.setItem(historyKey(), JSON.stringify(sorted.slice(0, MAX_HISTORY_LENGTH)));
  } catch {
    // Keep the completed result visible in the page if storage is unavailable.
  }
}

function compareWithPrevious(delayedCorrect: number): { label: string; detail: string; tone: ResultTone } {
  const previous = loadMemoryHistory()[0];
  if (!previous) {
    return {
      label: "Starting memory result",
      detail: "This first result creates a personal comparison point. Future sessions use a different original word list.",
      tone: "info",
    };
  }
  const difference = delayedCorrect - previous.delayedCorrect;
  if (difference >= 2) {
    return {
      label: "Higher delayed recall",
      detail: `You recalled ${difference} more word${difference === 1 ? "" : "s"} than in the previous session. Repeated testing and daily conditions can also affect scores.`,
      tone: "positive",
    };
  }
  if (difference <= -2) {
    return {
      label: "Lower delayed recall",
      detail: `You recalled ${Math.abs(difference)} fewer words than in the previous session. Fatigue, symptoms, distractions, sleep, and testing conditions can affect performance.`,
      tone: "caution",
    };
  }
  return {
    label: "Similar delayed recall",
    detail: "Delayed recall stayed within one word of the previous session.",
    tone: "neutral",
  };
}

export function saveMemoryAssessment(input: {
  wordListId: string;
  immediateTrials: number[];
  delayedCorrect: number;
  intrusionCount: number;
  delaySeconds: number;
  preTolerance?: TaskToleranceRatings;
  postTolerance?: TaskToleranceRatings;
}): MemoryAssessmentResult {
  const trials = input.immediateTrials.slice(0, 3).map((value) => Math.max(0, Math.min(10, Math.round(value))));
  while (trials.length < 3) trials.push(0);
  const learningTotal = trials.reduce((sum, value) => sum + value, 0);
  const finalLearningCorrect = trials[trials.length - 1] ?? 0;
  const delayedCorrect = Math.max(0, Math.min(10, Math.round(input.delayedCorrect)));
  const interpretation = compareWithPrevious(delayedCorrect);

  const result: MemoryAssessmentResult = {
    id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    assessmentType: "memory",
    completedAt: new Date().toISOString(),
    wordListId: input.wordListId,
    immediateTrials: trials,
    learningTotal,
    finalLearningCorrect,
    immediateCorrect: finalLearningCorrect,
    delayedCorrect,
    immediatePercent: Math.round((learningTotal / 30) * 100),
    delayedPercent: delayedCorrect * 10,
    retentionPercent: finalLearningCorrect > 0 ? Math.min(100, Math.round((delayedCorrect / finalLearningCorrect) * 100)) : null,
    intrusionCount: Math.max(0, Math.round(input.intrusionCount)),
    delaySeconds: Math.max(0, Math.round(input.delaySeconds)),
    interpretationLabel: interpretation.label,
    interpretationDetail: interpretation.detail,
    interpretationTone: interpretation.tone,
    preTolerance: input.preTolerance,
    postTolerance: input.postTolerance,
  };
  writeMemoryHistory([result, ...loadMemoryHistory()]);
  return result;
}

export function getMostRecentMemoryResult(): MemoryAssessmentResult | null {
  return loadMemoryHistory()[0] ?? null;
}

export function getStartingMemoryResult(): MemoryAssessmentResult | null {
  return loadMemoryHistory().sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1))[0] ?? null;
}

export function getMemoryDashboardRow(): AssessmentResult | null {
  const latest = getMostRecentMemoryResult();
  if (!latest) return null;
  const starting = getStartingMemoryResult();
  const isFirst = !starting || starting.id === latest.id;
  const percentFromStart =
    !isFirst && starting.delayedCorrect > 0
      ? ((latest.delayedCorrect - starting.delayedCorrect) / starting.delayedCorrect) * 100
      : null;

  return {
    id: latest.id,
    type: "memory",
    date: latest.completedAt.slice(0, 10),
    value: latest.delayedCorrect,
    unit: "of 10 delayed",
    startingValue: isFirst ? null : starting.delayedCorrect,
    percentFromStart: percentFromStart == null ? null : Math.round(percentFromStart),
    status: "completed",
    interpretationLabel: latest.interpretationLabel,
    interpretationDetail: latest.interpretationDetail,
    interpretationTone: latest.interpretationTone,
  };
}
