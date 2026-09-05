import type { AssessmentType, ResultTone } from "../../types";

export type ScheduleStatus = "completed" | "due-today" | "overdue" | "upcoming" | "not-started";

export interface ScheduleDefinition {
  assessmentType: AssessmentType;
  label: string;
  shortLabel: string;
  cadence: string;
  rationale: string;
  weekdays: number[];
  href: string;
}

export interface ScheduledAssessment {
  assessmentType: AssessmentType;
  label: string;
  shortLabel: string;
  date: string;
  href: string;
  status: ScheduleStatus;
}

export interface LatestAttentionItem {
  assessmentType: AssessmentType;
  label: string;
  resultLabel: string;
  detail: string;
  tone: ResultTone;
  href: string;
}
