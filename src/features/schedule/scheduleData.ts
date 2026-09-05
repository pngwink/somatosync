import type { ScheduleDefinition } from "./scheduleTypes";

// These are conservative prototype defaults, not a clinical prescription.
// They intentionally avoid requiring every test every day.
export const scheduleDefinitions: ScheduleDefinition[] = [
  {
    assessmentType: "symptom-check-in",
    label: "PCSS Symptom Scale",
    shortLabel: "PCSS",
    cadence: "Daily or when symptoms change",
    rationale: "Symptoms can change throughout recovery, so a short regular check-in provides the most useful day-to-day context.",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    href: "/app/assessments/pcss",
  },
  {
    assessmentType: "reaction-time",
    label: "Reaction Time",
    shortLabel: "Reaction",
    cadence: "Monday and Thursday",
    rationale: "Spacing sessions reduces repeated-test burden and makes it easier to compare performance under similar conditions.",
    weekdays: [1, 4],
    href: "/app/assessments/reaction-time",
  },
  {
    assessmentType: "memory",
    label: "Learning & Delayed Recall",
    shortLabel: "Recall",
    cadence: "Tuesday and Friday",
    rationale: "Repeated learning, a delayed recall interval, rotating lists, and spaced sessions reduce—but do not eliminate—practice and fatigue effects.",
    weekdays: [2, 5],
    href: "/app/assessments/memory",
  },
  {
    assessmentType: "balance",
    label: "Camera Balance",
    shortLabel: "Balance",
    cadence: "Wednesday and Saturday",
    rationale: "Fewer, consistent recordings are more useful than daily camera tests. Only repeat when standing feels safe.",
    weekdays: [3, 6],
    href: "/app/assessments/balance",
  },
];
