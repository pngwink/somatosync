import type { AppSessionMode } from "../../lib/session";
import type { AssessmentResult, AssessmentType } from "../../types";
import { recentAssessmentResults } from "../../data/assessments";
import { getBalanceDashboardRow, loadBalanceHistory } from "../assessments/balance/balanceStorage";
import { getMemoryDashboardRow, loadMemoryHistory } from "../assessments/memory/memoryStorage";
import { getPcssDashboardRow, loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { getReactionDashboardRow, loadReactionHistory } from "../assessments/reaction/reactionStorage";
import { interpretAssessmentResult } from "../assessments/shared/resultInterpretation";
import { scheduleDefinitions } from "./scheduleData";
import type { LatestAttentionItem, ScheduledAssessment } from "./scheduleTypes";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfCalendarWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function completionDates(mode: AppSessionMode): Partial<Record<AssessmentType, Set<string>>> {
  if (mode === "demo") {
    const output: Partial<Record<AssessmentType, Set<string>>> = {};
    for (const result of recentAssessmentResults) {
      const existing = output[result.type] ?? new Set<string>();
      existing.add(result.date);
      output[result.type] = existing;
    }
    return output;
  }

  return {
    "symptom-check-in": new Set(loadPcssHistory().map((entry) => entry.completedAt.slice(0, 10))),
    "reaction-time": new Set(loadReactionHistory().map((entry) => entry.completedAt.slice(0, 10))),
    memory: new Set(loadMemoryHistory().map((entry) => entry.completedAt.slice(0, 10))),
    balance: new Set(loadBalanceHistory().map((entry) => entry.completedAt.slice(0, 10))),
  };
}

export function buildTwoWeekSchedule(mode: AppSessionMode, now = new Date()): Array<{ date: Date; dateKey: string; tasks: ScheduledAssessment[] }> {
  const start = startOfCalendarWeek(now);
  const todayKey = toLocalDateKey(now);
  const completed = completionDates(mode);
  const allCompletionDates = Object.values(completed).flatMap((dates) => (dates ? Array.from(dates) : []));
  const trackingStartKey = allCompletionDates.sort()[0] ?? todayKey;

  return Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dateKey = toLocalDateKey(date);
    const tasks = scheduleDefinitions
      .filter((definition) => definition.weekdays.includes(date.getDay()))
      .map((definition): ScheduledAssessment => {
        const isCompleted = completed[definition.assessmentType]?.has(dateKey) ?? false;
        let status: ScheduledAssessment["status"];
        if (isCompleted) status = "completed";
        else if (dateKey < trackingStartKey) status = "not-started";
        else if (dateKey < todayKey) status = "overdue";
        else if (dateKey === todayKey) status = "due-today";
        else status = "upcoming";
        return {
          assessmentType: definition.assessmentType,
          label: definition.label,
          shortLabel: definition.shortLabel,
          date: dateKey,
          href: definition.href,
          status,
        };
      });
    return { date, dateKey, tasks };
  });
}

function liveRows(mode: AppSessionMode): AssessmentResult[] {
  if (mode === "demo") return recentAssessmentResults;
  return [getPcssDashboardRow(), getReactionDashboardRow(), getMemoryDashboardRow(), getBalanceDashboardRow()].filter(
    (row): row is AssessmentResult => row !== null
  );
}

const labels: Record<AssessmentType, string> = {
  "symptom-check-in": "PCSS symptoms",
  "reaction-time": "Reaction time",
  memory: "Learning & recall",
  balance: "Camera balance",
};

const hrefs: Record<AssessmentType, string> = {
  "symptom-check-in": "/app/assessments/pcss",
  "reaction-time": "/app/assessments/reaction-time",
  memory: "/app/assessments/memory",
  balance: "/app/assessments/balance",
};

export function getLatestAttentionItems(mode: AppSessionMode): LatestAttentionItem[] {
  return liveRows(mode).map((result) => {
    const interpretation = interpretAssessmentResult(result);
    return {
      assessmentType: result.type,
      label: labels[result.type],
      resultLabel: interpretation.label,
      detail: interpretation.detail,
      tone: interpretation.tone,
      href: hrefs[result.type],
    };
  });
}
