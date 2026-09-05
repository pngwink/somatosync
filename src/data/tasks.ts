import type { TodayTask, DailyCheckIn } from "../types";

export const todayTasks: TodayTask[] = [
  {
    id: "task_checkin",
    label: "Complete symptom check-in",
    description: "A 22-symptom PCSS-format snapshot of how you are feeling today.",
    estimatedMinutes: 2,
    completed: true,
    href: "/app/check-in",
  },
  {
    id: "task_reaction",
    label: "Take a reaction-time assessment",
    description: "A quick two-minute test of visual response speed.",
    estimatedMinutes: 2,
    completed: false,
    href: "/app/assessments",
  },
  {
    id: "task_screen_time",
    label: "Review today's screen-time recommendation",
    description: "Based on your recent symptom pattern.",
    estimatedMinutes: 1,
    completed: false,
    href: "/app/return-support",
  },
  {
    id: "task_rtl",
    label: "Continue current Return-to-Learn stage",
    description: "Stage 3 — partial school day with supports.",
    estimatedMinutes: 0,
    completed: false,
    href: "/app/return-support",
  },
];

export const recentCheckIns: DailyCheckIn[] = [
  {
    id: "ci_0728",
    date: "2026-07-28",
    completed: true,
    symptoms: {
      headache: 2,
      dizziness: 1,
      fatigue: 3,
      lightSensitivity: 2,
      noiseSensitivity: 1,
      concentration: 3,
      sleepQuality: 7,
      stress: 3,
    },
    screenExposureHours: 2.5,
  },
  {
    id: "ci_0727",
    date: "2026-07-27",
    completed: true,
    symptoms: {
      headache: 3,
      dizziness: 1,
      fatigue: 4,
      lightSensitivity: 3,
      noiseSensitivity: 2,
      concentration: 4,
      sleepQuality: 6,
      stress: 4,
    },
    screenExposureHours: 4,
  },
  {
    id: "ci_0726",
    date: "2026-07-26",
    completed: true,
    symptoms: {
      headache: 2,
      dizziness: 0,
      fatigue: 3,
      lightSensitivity: 1,
      noiseSensitivity: 1,
      concentration: 2,
      sleepQuality: 8,
      stress: 2,
    },
    screenExposureHours: 1.5,
  },
];
