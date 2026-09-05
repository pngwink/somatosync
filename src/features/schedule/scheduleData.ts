import type { ScheduleDefinition } from "./scheduleTypes";

// These are conservative prototype defaults, not a clinical prescription.
// They intentionally avoid requiring every test every day.
export const scheduleDefinitions: ScheduleDefinition[] = [
  {
    assessmentType: "symptom-check-in",
    label: "PCSS Symptom Scale",
    shortLabel: "PCSS",
    cadence: "At most once daily, or as clinically directed",
    rationale: "One purposeful daily check-in is usually more useful than repeatedly inspecting small symptom fluctuations. Skip it when a clinician recommends a different plan.",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    href: "/app/assessments/pcss",
  },
  {
    assessmentType: "reaction-time",
    label: "Reaction Time",
    shortLabel: "Reaction",
    cadence: "Optional weekly trend",
    rationale: "This experimental task is optional. Wider spacing reduces repeated-test burden and practice effects; daily function is more important than frequent retesting.",
    weekdays: [1],
    href: "/app/assessments/reaction-time",
  },
  {
    assessmentType: "memory",
    label: "Learning & Delayed Recall",
    shortLabel: "Recall",
    cadence: "Optional weekly trend",
    rationale: "This experimental task is optional. Weekly spacing reduces—but does not eliminate—practice and fatigue effects; it should not drive recovery decisions by itself.",
    weekdays: [3],
    href: "/app/assessments/memory",
  },
  {
    assessmentType: "balance",
    label: "Postural Movement",
    shortLabel: "Balance",
    cadence: "Optional weekly trend",
    rationale: "This experimental camera trend is optional. Fewer, comparable recordings are more useful than repeated testing, and it should only be attempted when standing feels safe.",
    weekdays: [6],
    href: "/app/assessments/balance",
  },
];
