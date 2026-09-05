import { pcssSymptoms } from "../assessments/pcss/pcssData";
import type { PcssRatings, PcssSymptomId } from "../assessments/pcss/pcssTypes";

export type VoiceConfidence = "high" | "medium" | "low";
export type VoiceSeveritySource = "explicit" | "descriptive" | "functional-impact" | "conservative-default";

export interface DetectedVoiceSymptom {
  id: PcssSymptomId;
  label: string;
  evidence: string;
  severity: number;
  confidence: VoiceConfidence;
  severitySource: VoiceSeveritySource;
  rationale: string;
}

export interface VoiceExtractionResult {
  symptoms: DetectedVoiceSymptom[];
  activityContexts: string[];
  dangerSigns: string[];
}

const aliases: Record<PcssSymptomId, string[]> = {
  headache: ["headache", "head pain", "head hurts", "pressure in my head"],
  nausea: ["nausea", "nauseous", "sick to my stomach", "queasy"],
  vomiting: ["vomiting", "vomited", "throwing up", "threw up"],
  balanceProblems: ["balance problems", "off balance", "unsteady", "wobbly", "stumbling"],
  dizziness: ["dizzy", "dizziness", "lightheaded", "room spinning"],
  sensitivityToLight: ["light sensitivity", "sensitive to light", "bright lights", "lights bothered me", "photophobia"],
  sensitivityToNoise: ["noise sensitivity", "sensitive to noise", "loud sounds", "noise bothered me", "sounds bothered me"],
  numbnessTingling: ["numbness", "tingling", "pins and needles"],
  visualProblems: ["visual problems", "blurry vision", "blurred vision", "double vision", "trouble seeing", "eyes could not focus", "eyes couldn't focus"],
  fatigue: ["fatigue", "fatigued", "tired", "exhausted", "worn out", "drained"],
  troubleFallingAsleep: ["trouble falling asleep", "could not fall asleep", "couldn't fall asleep", "hard to fall asleep", "insomnia"],
  sleepTooMuch: ["sleeping more", "slept too much", "oversleeping", "sleep more than usual"],
  sleepTooLittle: ["sleeping less", "not sleeping enough", "slept too little", "sleep less than usual"],
  drowsiness: ["drowsy", "sleepy", "dozing off"],
  irritability: ["irritable", "irritability", "easily annoyed", "short tempered"],
  sadness: ["sad", "sadness", "feeling down", "felt down", "low mood"],
  nervousness: ["anxious", "anxiety", "nervous", "worried"],
  moreEmotional: ["more emotional", "emotional", "crying more", "mood swings"],
  slowedDown: ["slowed down", "feeling slow", "moving slowly", "thinking slowly"],
  mentallyFoggy: ["brain fog", "mentally foggy", "foggy", "cloudy thinking"],
  difficultyConcentrating: ["trouble concentrating", "difficulty concentrating", "cannot focus", "can't focus", "hard to focus", "lost focus"],
  memoryProblems: ["memory problems", "forgetful", "forgetting things", "trouble remembering", "can't remember", "could not remember"],
};

const contextPatterns: Array<[string, RegExp]> = [
  ["School or homework", /\b(school|class|math|science|homework|studying|test|teacher|lecture)\b/i],
  ["Work", /\b(work|shift|meeting|job|office|coworker|customer)\b/i],
  ["Screens or reading", /\b(screen|phone|computer|laptop|tablet|reading|scrolling|video game|gaming)\b/i],
  ["Physical activity", /\b(walk|walking|jog|running|exercise|bike|cycling|practice|workout|stairs)\b/i],
  ["Driving or transportation", /\b(drive|driving|car ride|bus|train|commute)\b/i],
  ["Daily life or caregiving", /\b(cooking|cleaning|shopping|childcare|caregiving|chores|daily activity)\b/i],
];

const dangerPatterns: Array<[string, RegExp]> = [
  ["Repeated vomiting", /\b(repeated vomiting|vomited (?:three|3|multiple|several) times|keep(?:s)? throwing up)\b/i],
  ["Seizure or convulsion", /\b(seizure|convulsion|convulsing)\b/i],
  ["Slurred speech", /\b(slurred speech|speech is slurred|talking strangely)\b/i],
  ["Increasing confusion", /\b(increasing confusion|more confused|cannot recognize|can't recognize|unusual behavior)\b/i],
  ["Difficulty waking", /\b(cannot wake|can't wake|hard to wake|won't wake|very difficult to wake)\b/i],
  ["Weakness or numbness", /\b(one-sided weakness|weakness in (?:my|the) arm|weakness in (?:my|the) leg|new numbness)\b/i],
  ["Unequal pupils", /\b(unequal pupils|one pupil larger)\b/i],
  ["Loss of consciousness", /\b(lost consciousness|passed out|blacked out|unconscious)\b/i],
  ["Worsening severe headache", /\b(worst headache|severe headache (?:getting|became) worse|headache keeps worsening)\b/i],
];

const numberWords: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

function sentenceContaining(text: string, index: number): string {
  const before = Math.max(text.lastIndexOf(".", index), text.lastIndexOf("?", index), text.lastIndexOf("!", index));
  const afterCandidates = [text.indexOf(".", index), text.indexOf("?", index), text.indexOf("!", index)].filter((value) => value >= 0);
  const after = afterCandidates.length ? Math.min(...afterCandidates) : text.length;
  return text.slice(Math.max(0, before + 1), after + 1).trim();
}

function clauseContaining(text: string, index: number, aliasLength: number): string {
  const sentence = sentenceContaining(text, index);
  const sentenceStart = text.indexOf(sentence);
  const localIndex = Math.max(0, index - Math.max(0, sentenceStart));
  const lower = sentence.toLowerCase();
  const beforeDelimiters = [",", ";", " and ", " but ", " while ", " then "];
  const afterDelimiters = [",", ";", " and ", " but ", " while ", " then "];
  let start = 0;
  for (const delimiter of beforeDelimiters) {
    const found = lower.lastIndexOf(delimiter, localIndex - 1);
    if (found >= 0) start = Math.max(start, found + delimiter.length);
  }
  let end = sentence.length;
  for (const delimiter of afterDelimiters) {
    const found = lower.indexOf(delimiter, localIndex + aliasLength);
    if (found >= 0) end = Math.min(end, found);
  }
  return sentence.slice(start, end).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNegated(text: string, index: number): boolean {
  const prefix = text.slice(Math.max(0, index - 55), index).toLowerCase();
  return /\b(no|not|never|without|didn['’]?t|don['’]?t|do not|haven['’]?t|have not|wasn['’]?t|was not)\b[^,.!?]{0,34}$/.test(prefix);
}

interface SeverityInference {
  severity: number;
  confidence: VoiceConfidence;
  source: VoiceSeveritySource;
  rationale: string;
}

function explicitSeverity(local: string): number | null {
  const digit = local.match(/\b(?:level|severity|about|around|was|is|at|a)?\s*([0-6])\s*(?:\/\s*6|out of 6|out of six)?\b/);
  if (digit) return Number(digit[1]);
  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\s*(?:out of six)?\\b`, "i").test(local)) return value;
  }
  return null;
}

function inferSeverity(evidence: string, aliasIndex: number, aliasLength = 0): SeverityInference {
  const lower = evidence.toLowerCase();
  const after = lower.slice(aliasIndex, Math.min(lower.length, aliasIndex + aliasLength + 110));
  const before = lower.slice(Math.max(0, aliasIndex - 45), aliasIndex);
  const local = `${before} ${after}`.replace(/\s+/g, " ").trim();
  const explicit = explicitSeverity(local);
  if (explicit != null) {
    return {
      severity: explicit,
      confidence: "high",
      source: "explicit",
      rationale: `You stated a severity of ${explicit} out of 6.`,
    };
  }

  if (/\b(unbearable|extreme|worst|excruciating|could not function|couldn't function)\b/.test(local)) {
    return { severity: 6, confidence: "high", source: "descriptive", rationale: "Your wording described an extreme or function-stopping symptom." };
  }
  if (/\b(very severe|really severe|severe|awful|terrible)\b/.test(local)) {
    return { severity: 5, confidence: "high", source: "descriptive", rationale: "You used strong severity language such as severe, awful, or terrible." };
  }
  if (/\b(had to stop|needed to stop|could not finish|couldn't finish|left class|left work|had to lie down|needed to lie down|could not continue|couldn't continue|missed class|missed work)\b/.test(local)) {
    return { severity: 4, confidence: "medium", source: "functional-impact", rationale: "You described the symptom interrupting or stopping an activity." };
  }
  if (/\b(moderately severe|pretty bad|quite bad|really bad|very tired|exhausted|drained|made it hard|struggled to|interfered with|slowed me down|hard to keep going)\b/.test(local)) {
    return { severity: 4, confidence: "medium", source: "functional-impact", rationale: "You described a substantial effect on what you were trying to do." };
  }
  if (/\b(moderate|noticeable|hard to|difficult to|worse during|worse after|kept bothering)\b/.test(local)) {
    return { severity: 3, confidence: "medium", source: "descriptive", rationale: "Your wording suggested a noticeable symptom that affected the activity." };
  }
  if (/\b(mild|a little|slight|slightly|somewhat|bothered me|annoying)\b/.test(local)) {
    return { severity: 2, confidence: "medium", source: "descriptive", rationale: "Your wording suggested a mild but noticeable symptom." };
  }
  if (/\b(very mild|barely|tiny bit|hardly)\b/.test(local)) {
    return { severity: 1, confidence: "high", source: "descriptive", rationale: "You described the symptom as barely present or very mild." };
  }

  return {
    severity: 2,
    confidence: "low",
    source: "conservative-default",
    rationale: "You mentioned this symptom but did not describe its intensity, so SomatoSync started with a mild score for you to review.",
  };
}

export function extractVoiceSymptoms(transcript: string): VoiceExtractionResult {
  const lower = transcript.toLowerCase();
  const symptoms: DetectedVoiceSymptom[] = [];

  for (const definition of pcssSymptoms) {
    let best: DetectedVoiceSymptom | null = null;
    for (const alias of aliases[definition.id]) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "gi");
      for (const match of transcript.matchAll(pattern)) {
        const index = match.index ?? -1;
        if (index < 0 || isNegated(lower, index)) continue;
        const evidence = clauseContaining(transcript, index, alias.length) || sentenceContaining(transcript, index);
        const relativeIndex = Math.max(0, evidence.toLowerCase().indexOf(alias));
        const inference = inferSeverity(evidence, relativeIndex, alias.length);
        const candidate: DetectedVoiceSymptom = {
          id: definition.id,
          label: definition.label,
          evidence,
          severity: inference.severity,
          confidence: inference.confidence,
          severitySource: inference.source,
          rationale: inference.rationale,
        };
        if (!best || candidate.severity > best.severity || (candidate.severity === best.severity && candidate.confidence === "high")) best = candidate;
      }
    }
    if (best) symptoms.push(best);
  }

  const activityContexts = contextPatterns.filter(([, pattern]) => pattern.test(transcript)).map(([label]) => label);
  const dangerSigns = dangerPatterns.filter(([, pattern]) => pattern.test(transcript)).map(([label]) => label);
  return { symptoms, activityContexts, dangerSigns };
}

export function ratingsFromDetectedSymptoms(symptoms: DetectedVoiceSymptom[]): PcssRatings {
  const ratings = Object.fromEntries(pcssSymptoms.map((symptom) => [symptom.id, 0])) as PcssRatings;
  for (const symptom of symptoms) ratings[symptom.id] = symptom.severity;
  return ratings;
}
