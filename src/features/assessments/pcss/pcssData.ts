import type { PcssCategory, PcssRatings, PcssSymptomDefinition, PcssSymptomId } from "./pcssTypes";

export const PCSS_MAX_ITEM_SCORE = 6;
export const PCSS_MAX_TOTAL_SCORE = 132;

export const pcssSymptoms: PcssSymptomDefinition[] = [
  { id: "headache", label: "Headache", category: "physical" },
  { id: "nausea", label: "Nausea", category: "physical" },
  { id: "vomiting", label: "Vomiting", category: "physical" },
  { id: "balanceProblems", label: "Balance problems", category: "physical" },
  { id: "dizziness", label: "Dizziness", category: "physical" },
  { id: "sensitivityToLight", label: "Sensitivity to light", category: "physical" },
  { id: "sensitivityToNoise", label: "Sensitivity to noise", category: "physical" },
  { id: "numbnessTingling", label: "Numbness or tingling", category: "physical" },
  { id: "visualProblems", label: "Visual problems", category: "physical" },
  { id: "fatigue", label: "Tired or fatigued", category: "sleep" },
  { id: "troubleFallingAsleep", label: "Trouble falling asleep", category: "sleep" },
  { id: "sleepTooMuch", label: "Sleeping more than usual", category: "sleep" },
  { id: "sleepTooLittle", label: "Sleeping less than usual", category: "sleep" },
  { id: "drowsiness", label: "Drowsiness", category: "sleep" },
  { id: "irritability", label: "Irritability", category: "emotional" },
  { id: "sadness", label: "Sadness", category: "emotional" },
  { id: "nervousness", label: "Nervous or anxious", category: "emotional" },
  { id: "moreEmotional", label: "More emotional", category: "emotional" },
  { id: "slowedDown", label: "Feeling slowed down", category: "cognitive" },
  { id: "mentallyFoggy", label: "Feeling mentally foggy", category: "cognitive" },
  { id: "difficultyConcentrating", label: "Difficulty concentrating", category: "cognitive" },
  { id: "memoryProblems", label: "Memory problems", category: "cognitive" },
];

export const pcssCategoryLabels: Record<PcssCategory, string> = {
  physical: "Physical and sensory",
  sleep: "Sleep and fatigue",
  emotional: "Emotional",
  cognitive: "Cognitive",
};

export function createEmptyPcssRatings(): PcssRatings {
  return Object.fromEntries(pcssSymptoms.map((symptom) => [symptom.id, 0])) as PcssRatings;
}

export function calculatePcssSummary(ratings: PcssRatings) {
  const categoryTotals = {
    physical: 0,
    sleep: 0,
    emotional: 0,
    cognitive: 0,
  };
  let totalSeverity = 0;
  let symptomCount = 0;

  for (const symptom of pcssSymptoms) {
    const score = Math.max(0, Math.min(PCSS_MAX_ITEM_SCORE, Number(ratings[symptom.id]) || 0));
    totalSeverity += score;
    categoryTotals[symptom.category] += score;
    if (score > 0) symptomCount += 1;
  }

  return { totalSeverity, symptomCount, categoryTotals };
}

export function topPcssSymptoms(ratings: PcssRatings, limit = 3): Array<{ id: PcssSymptomId; label: string; score: number }> {
  return pcssSymptoms
    .map((symptom) => ({ id: symptom.id, label: symptom.label, score: ratings[symptom.id] }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
