import type { AssessmentDefinition, AssessmentResult } from "../types";

export const assessmentDefinitions: AssessmentDefinition[] = [
  {
    id: "reaction-time",
    name: "Reaction Time · Experimental trend",
    purpose:
      "A browser-based response-speed task for within-person trends only. Device latency, sleep, attention, symptoms, and practice can affect results; it does not measure concussion severity or clearance.",
    estimatedDurationMinutes: 3,
    requiresDevice: null,
    suggestedCadence: "Optional weekly",
    cadenceNote: "Use similar lighting, device, and time of day when possible.",
  },
  {
    id: "balance",
    name: "Postural Movement · Experimental trend",
    purpose:
      "Uses a short eyes-open camera recording to estimate visible postural movement and a head-steadiness proxy. Camera conditions can affect results; this is not BESS, mBESS, VOMS, diagnosis, or clearance.",
    estimatedDurationMinutes: 2,
    requiresDevice: "camera",
    suggestedCadence: "Optional weekly",
    cadenceNote: "Repeat only when standing feels safe and camera conditions are comparable.",
  },
  {
    id: "memory",
    name: "Learning & Delayed Recall · Experimental trend",
    purpose:
      "An original browser task with three learning trials plus delayed free recall. Performance and task tolerance stay separate; it is not a clinician-administered neuropsychological test.",
    estimatedDurationMinutes: 7,
    requiresDevice: null,
    suggestedCadence: "Optional weekly",
    cadenceNote: "Three learning trials and delayed recall use rotating original lists; practice, fatigue, and attention still affect results.",
  },
  {
    id: "symptom-check-in",
    name: "PCSS Symptom Scale · Recognized symptom instrument",
    purpose:
      "Tracks 22 post-concussion symptoms on a 0–6 severity scale, with a total from 0 to 132. Symptom scores support monitoring and conversations; they do not diagnose concussion or determine recovery by themselves.",
    estimatedDurationMinutes: 4,
    requiresDevice: null,
    suggestedCadence: "At most once daily",
    cadenceNote: "Use one purposeful check-in rather than repeatedly checking small fluctuations. Follow individualized clinical advice when it differs.",
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
    unit: "% calibrated movement",
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
