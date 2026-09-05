import type { AssessmentDefinition, AssessmentResult } from "../types";

export const assessmentDefinitions: AssessmentDefinition[] = [
  {
    id: "reaction-time",
    name: "Reaction Time",
    purpose:
      "Measures repeated visual response speed for within-person trend tracking. Device, sleep, attention, and practice can affect results.",
    estimatedDurationMinutes: 3,
    requiresDevice: null,
    suggestedCadence: "Twice weekly",
    cadenceNote: "Use similar lighting, device, and time of day when possible.",
  },
  {
    id: "balance",
    name: "Camera Balance & Head Steadiness",
    purpose:
      "Uses a short eyes-open camera recording to estimate lateral body movement and head steadiness, while a before/after symptom check records task tolerance separately.",
    estimatedDurationMinutes: 2,
    requiresDevice: "camera",
    suggestedCadence: "Twice weekly",
    cadenceNote: "Repeat only when standing feels safe and camera conditions are comparable.",
  },
  {
    id: "memory",
    name: "Learning & Delayed Recall",
    purpose:
      "Three learning trials plus delayed free recall, paired with a brief before/after symptom check so memory performance and task tolerance stay separate.",
    estimatedDurationMinutes: 7,
    requiresDevice: null,
    suggestedCadence: "Twice weekly",
    cadenceNote: "Three learning trials and delayed recall use rotating original lists; practice, fatigue, and attention still affect results.",
  },
  {
    id: "symptom-check-in",
    name: "PCSS Symptom Scale",
    purpose:
      "Tracks 22 post-concussion symptoms on a 0–6 severity scale, with a total from 0 to 132 and separate symptom-domain totals.",
    estimatedDurationMinutes: 4,
    requiresDevice: null,
    suggestedCadence: "Daily or when symptoms change",
    cadenceNote: "A standardized symptom inventory is the strongest routine self-report domain in this prototype.",
  },
];

/** Sample results shown only inside Maya Chen's demo profile. */
export const recentAssessmentResults: AssessmentResult[] = [
  {
    id: "res_symptom_0728",
    type: "symptom-check-in",
    date: "2026-07-28",
    value: 18,
    unit: "of 132 severity",
    startingValue: 62,
    percentFromStart: 71,
    status: "completed",
    interpretationLabel: "Lower symptom burden",
    interpretationDetail: "Maya reports fewer and less-severe symptoms than at her first assessment.",
    interpretationTone: "positive",
  },
  {
    id: "res_reaction_0728",
    type: "reaction-time",
    date: "2026-07-28",
    value: 299,
    unit: "ms",
    startingValue: 402,
    percentFromStart: 26,
    status: "completed",
    interpretationLabel: "Faster reaction time",
    interpretationDetail: "Maya's median response is faster than her first recorded assessment.",
    interpretationTone: "positive",
  },
  {
    id: "res_balance_0726",
    type: "balance",
    date: "2026-07-26",
    value: 0.82,
    unit: "% lateral sway",
    startingValue: 1.46,
    percentFromStart: 44,
    status: "completed",
    interpretationLabel: "Lower camera-measured movement",
    interpretationDetail: "Maya's sample lateral movement is lower than her first demo recording. Her latest demo session also records a small dizziness increase during the task.",
    interpretationTone: "positive",
  },
  {
    id: "res_memory_0723",
    type: "memory",
    date: "2026-07-23",
    value: 7,
    unit: "of 10 delayed",
    startingValue: 4,
    percentFromStart: 75,
    status: "completed",
    interpretationLabel: "More words recalled",
    interpretationDetail: "Maya recalled more words than in her first sample task. Her latest demo session also records a small fatigue increase so performance and task tolerance stay separate.",
    interpretationTone: "positive",
  },
];

export function getMostRecentResult(type: AssessmentResult["type"]): AssessmentResult | undefined {
  return recentAssessmentResults
    .filter((r) => r.type === type)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}
