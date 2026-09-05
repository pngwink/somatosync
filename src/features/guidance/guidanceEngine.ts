import type { ResultTone } from "../../types";
import type { PcssAssessmentResult, PcssSymptomId } from "../assessments/pcss/pcssTypes";

export interface GuidanceSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export interface SymptomGuidanceItem {
  id: string;
  title: string;
  trigger: string;
  tone: ResultTone;
  suggestions: string[];
  sourceIds: string[];
}

export const recoveryGuidanceSources: GuidanceSource[] = [
  {
    id: "amsterdam-2022",
    title: "Consensus statement on concussion in sport — Amsterdam 2022",
    publisher: "British Journal of Sports Medicine",
    url: "https://bjsm.bmj.com/content/57/11/695",
    note: "Supports relative rest, gradual activity, multimodal recovery assessment, and graded return strategies.",
  },
  {
    id: "ontario-return",
    title: "Return-to-Activity / Work / School Considerations",
    publisher: "Living Concussion Guidelines",
    url: "https://concussionsontario.org/concussion/guideline-section/return-to-activity_work_school_considerations",
    note: "Supports individualized pacing, graded activity, school/work accommodations, and avoiding prolonged inactivity.",
  },
  {
    id: "ontario-prolonged",
    title: "Diagnosis and Assessment of Prolonged Symptoms",
    publisher: "Living Concussion Guidelines",
    url: "https://concussionsontario.org/concussion/guideline-section/diagnosis-assessment-of-prolonged-symptoms",
    note: "Supports symptom-specific assessment and multimodal follow-up when symptoms persist.",
  },
  {
    id: "peds-guideline",
    title: "Living Guideline for Pediatric Concussion Care",
    publisher: "PedsConcussion",
    url: "https://pedsconcussion.com/",
    note: "Provides pediatric return-to-school, return-to-activity, symptom, cognition, fatigue, vision, and balance guidance.",
  },
  {
    id: "cdc-recovery",
    title: "What to Do After a Concussion",
    publisher: "CDC HEADS UP",
    url: "https://www.cdc.gov/heads-up/guidelines/recovery-from-concussion.html",
    note: "Provides public-facing guidance on gradual return to activities and when to seek follow-up.",
  },
];

function rating(result: PcssAssessmentResult, id: PcssSymptomId): number {
  return Number(result.ratings[id]) || 0;
}

function maxRating(result: PcssAssessmentResult, ids: PcssSymptomId[]): number {
  return Math.max(...ids.map((id) => rating(result, id)));
}

function severityTone(score: number): ResultTone {
  if (score >= 5) return "caution";
  if (score >= 3) return "info";
  return "neutral";
}

interface GuidanceRule {
  id: string;
  title: string;
  symptomIds: PcssSymptomId[];
  minimumScore: number;
  suggestions: string[];
  sourceIds: string[];
}

const rules: GuidanceRule[] = [
  {
    id: "light-visual",
    title: "Reduce visual load without complete isolation",
    symptomIds: ["sensitivityToLight", "visualProblems", "headache"],
    minimumScore: 2,
    suggestions: [
      "Lower screen brightness and reduce glare; increase text size or use printed/audio materials when that is easier.",
      "Use shorter screen or reading sessions with planned breaks before symptoms become significantly worse.",
      "After the first 24–48 hours, avoid staying in a dark room all day; gradually reintroduce tolerable activity.",
    ],
    sourceIds: ["amsterdam-2022", "ontario-return", "peds-guideline"],
  },
  {
    id: "cognitive-load",
    title: "Pace concentration and memory demands",
    symptomIds: ["difficultyConcentrating", "memoryProblems", "mentallyFoggy", "slowedDown"],
    minimumScore: 2,
    suggestions: [
      "Break school, work, or household tasks into short single-task blocks with brief low-stimulation breaks.",
      "Use written instructions, checklists, reminders, and extra time instead of relying on memory alone.",
      "Alternate higher-demand tasks with simpler activities and stop before symptoms become significant or prolonged.",
    ],
    sourceIds: ["ontario-return", "ontario-prolonged", "peds-guideline"],
  },
  {
    id: "fatigue",
    title: "Plan around fatigue instead of pushing through it",
    symptomIds: ["fatigue", "drowsiness", "slowedDown"],
    minimumScore: 2,
    suggestions: [
      "Schedule demanding tasks for times of day when energy is usually better.",
      "Use predictable rest breaks and gradually increase duration only when the previous amount is tolerated.",
      "Keep some safe daily activity and routine; prolonged inactivity can make return to normal roles harder.",
    ],
    sourceIds: ["ontario-return", "peds-guideline", "amsterdam-2022"],
  },
  {
    id: "sleep",
    title: "Protect a consistent sleep routine",
    symptomIds: ["troubleFallingAsleep", "sleepTooMuch", "sleepTooLittle", "drowsiness"],
    minimumScore: 2,
    suggestions: [
      "Keep wake and sleep times as consistent as possible and use a calm wind-down routine.",
      "Avoid stacking demanding work late in the day when fatigue is high.",
      "Discuss persistent sleep disturbance with a healthcare professional because sleep can affect recovery and daily function.",
    ],
    sourceIds: ["amsterdam-2022", "ontario-prolonged", "peds-guideline"],
  },
  {
    id: "dizziness-balance",
    title: "Reduce fall risk and monitor dizziness",
    symptomIds: ["dizziness", "balanceProblems", "nausea"],
    minimumScore: 2,
    suggestions: [
      "Avoid ladders, heights, cycling in traffic, contact activity, or other situations where dizziness could cause another injury.",
      "Use support nearby during balance-related activities and stop if symptoms become significant or prolonged.",
      "If dizziness, balance problems, neck pain, or headaches persist, ask whether vestibular or cervicovestibular assessment is appropriate.",
    ],
    sourceIds: ["amsterdam-2022", "ontario-prolonged", "peds-guideline"],
  },
  {
    id: "noise",
    title: "Modify noisy environments",
    symptomIds: ["sensitivityToNoise", "headache"],
    minimumScore: 2,
    suggestions: [
      "Choose quieter spaces for focused work and step out briefly when noise causes a clear symptom increase.",
      "Ask for seating away from speakers, hallways, machinery, or other high-noise areas.",
      "Gradually rebuild tolerance rather than avoiding normal sound continuously for long periods.",
    ],
    sourceIds: ["ontario-return", "peds-guideline"],
  },
  {
    id: "emotional",
    title: "Add social and emotional support",
    symptomIds: ["irritability", "sadness", "nervousness", "moreEmotional"],
    minimumScore: 3,
    suggestions: [
      "Tell a trusted adult, family member, counselor, or clinician when mood symptoms are interfering with daily life.",
      "Keep manageable social contact and meaningful routines instead of complete isolation.",
      "Use a written plan for school, work, or household expectations to reduce uncertainty and stress.",
    ],
    sourceIds: ["ontario-prolonged", "peds-guideline"],
  },
  {
    id: "headache",
    title: "Track headache triggers and tolerance",
    symptomIds: ["headache", "sensitivityToLight", "sensitivityToNoise"],
    minimumScore: 3,
    suggestions: [
      "Record which activities, environments, or times of day are linked with headache increases.",
      "Reduce the duration or intensity of the provoking activity, then return gradually when symptoms settle.",
      "Seek clinical review for worsening, severe, or persistent headache rather than relying only on the app.",
    ],
    sourceIds: ["ontario-prolonged", "peds-guideline", "cdc-recovery"],
  },
];

export function buildSymptomGuidance(result: PcssAssessmentResult | null): SymptomGuidanceItem[] {
  if (!result) return [];
  return rules
    .map((rule) => {
      const strongest = maxRating(result, rule.symptomIds);
      if (strongest < rule.minimumScore) return null;
      const names = rule.symptomIds
        .filter((id) => rating(result, id) >= rule.minimumScore)
        .map((id) => id)
        .slice(0, 3);
      return {
        id: rule.id,
        title: rule.title,
        trigger: `Shown because this check-in recorded ${names.length > 0 ? names.map(humanizeSymptomId).join(", ") : "related symptoms"} with a highest related rating of ${strongest} of 6.`,
        tone: severityTone(strongest),
        suggestions: rule.suggestions,
        sourceIds: rule.sourceIds,
        strongest,
      };
    })
    .filter((item): item is SymptomGuidanceItem & { strongest: number } => item !== null)
    .sort((a, b) => b.strongest - a.strongest)
    .slice(0, 5)
    .map(({ strongest: _strongest, ...item }) => item);
}

function humanizeSymptomId(id: PcssSymptomId): string {
  const labels: Record<PcssSymptomId, string> = {
    headache: "headache",
    nausea: "nausea",
    vomiting: "vomiting",
    balanceProblems: "balance problems",
    dizziness: "dizziness",
    fatigue: "fatigue",
    troubleFallingAsleep: "trouble falling asleep",
    sleepTooMuch: "sleeping more than usual",
    sleepTooLittle: "sleeping less than usual",
    drowsiness: "drowsiness",
    sensitivityToLight: "light sensitivity",
    sensitivityToNoise: "noise sensitivity",
    irritability: "irritability",
    sadness: "sadness",
    nervousness: "anxiety",
    moreEmotional: "feeling more emotional",
    numbnessTingling: "numbness or tingling",
    slowedDown: "feeling slowed down",
    mentallyFoggy: "mental fog",
    difficultyConcentrating: "concentration difficulty",
    memoryProblems: "memory difficulty",
    visualProblems: "visual difficulty",
  };
  return labels[id];
}

export function sourcesForGuidance(items: SymptomGuidanceItem[]): GuidanceSource[] {
  const ids = new Set(items.flatMap((item) => item.sourceIds));
  return recoveryGuidanceSources.filter((source) => ids.has(source.id));
}
