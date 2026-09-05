import type { ResearchTopic } from "../../data/research";
import type { ResearchVerification } from "../../types";
import { normalizeResearchText, researchTokens } from "./researchShared";

export type ResearchIntent =
  | "emergency"
  | "diagnosis-request"
  | "clearance-request"
  | "timeline-request"
  | "research"
  | "unsupported";

export interface InputGuardResult {
  originalQuestion: string;
  sanitizedQuestion: string;
  intent: ResearchIntent;
  injectionDetected: boolean;
  deterministicOnly: boolean;
  reason: string;
}

const INJECTION_PATTERNS = [
  /ignore (all|any|the) (previous|prior|above) (instructions|rules|prompts?)/i,
  /reveal (the )?(system|developer) prompt/i,
  /show (me )?(your|the) hidden instructions/i,
  /act as if (the )?rules do not apply/i,
  /bypass (the )?(safety|medical|policy) rules/i,
  /jailbreak/i,
];

const EMERGENCY_PATTERNS = [
  /seizure/i,
  /repeated vomiting/i,
  /won'?t wake/i,
  /difficulty waking/i,
  /loss of consciousness/i,
  /slurred speech/i,
  /weakness|numbness/i,
  /unequal pupils?/i,
  /worsening (severe )?headache/i,
  /call 911|emergency room|go to (the )?hospital/i,
];

const DIAGNOSIS_PATTERNS = [
  /do i have (a )?concussion/i,
  /diagnose me/i,
  /is this (a )?concussion/i,
  /tell me what condition i have/i,
];

const CLEARANCE_PATTERNS = [
  /am i (medically )?(ready|cleared|safe) (to|for)/i,
  /clear me/i,
  /can i return to (play|sport|contact|competition|driving|work|school)/i,
  /am i safe to drive/i,
  /can i drive (today|tomorrow|now|again)?/i,
  /is my reaction time (good|fast) enough to drive/i,
  /tell me i can play/i,
];

const TIMELINE_PATTERNS = [
  /exact(ly)? how long/i,
  /what day will i recover/i,
  /how many days until/i,
  /will i recover (in|by)/i,
  /predict my recovery (date|time|timeline)/i,
];

function stripInjectionText(question: string): string {
  return INJECTION_PATTERNS.reduce((value, pattern) => value.replace(pattern, " "), question)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

export function guardResearchInput(question: string): InputGuardResult {
  const trimmed = question.trim().slice(0, 800);
  const injectionDetected = INJECTION_PATTERNS.some((pattern) => pattern.test(trimmed));
  const sanitizedQuestion = stripInjectionText(trimmed);

  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      originalQuestion: trimmed,
      sanitizedQuestion,
      intent: "emergency",
      injectionDetected,
      deterministicOnly: true,
      reason: "Possible urgent warning-sign language must bypass generative AI.",
    };
  }
  if (DIAGNOSIS_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      originalQuestion: trimmed,
      sanitizedQuestion,
      intent: "diagnosis-request",
      injectionDetected,
      deterministicOnly: true,
      reason: "The user requested a diagnosis, which SomatoSync does not provide.",
    };
  }
  if (CLEARANCE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      originalQuestion: trimmed,
      sanitizedQuestion,
      intent: "clearance-request",
      injectionDetected,
      deterministicOnly: true,
      reason: "Medical clearance and readiness decisions must remain clinician-led.",
    };
  }
  if (TIMELINE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      originalQuestion: trimmed,
      sanitizedQuestion,
      intent: "timeline-request",
      injectionDetected,
      deterministicOnly: true,
      reason: "An exact personal recovery date cannot be supported by this app.",
    };
  }
  if (!researchTokens(sanitizedQuestion).length) {
    return {
      originalQuestion: trimmed,
      sanitizedQuestion,
      intent: "unsupported",
      injectionDetected,
      deterministicOnly: true,
      reason: "The question did not contain enough research content to retrieve evidence.",
    };
  }
  return {
    originalQuestion: trimmed,
    sanitizedQuestion,
    intent: "research",
    injectionDetected,
    deterministicOnly: false,
    reason: injectionDetected
      ? "Prompt-injection language was removed before retrieval."
      : "The question can proceed through the grounded research pipeline.",
  };
}

const FORBIDDEN_OUTPUT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /you (definitely |clearly )?have (a )?concussion/i, reason: "The answer attempted to diagnose the user." },
  { pattern: /you are (medically )?(cleared|safe|ready) to/i, reason: "The answer attempted to grant medical clearance." },
  { pattern: /(your reaction time|the camera result).{0,40}(means|shows|proves).{0,30}(safe to drive|safe to play|recovered|cleared)/i, reason: "The answer attempted to turn an experimental metric into a safety or clearance conclusion." },
  { pattern: /you will recover (in|within|by)/i, reason: "The answer attempted to predict a personal recovery timeline." },
  { pattern: /normal range|clinically normal/i, reason: "The answer presented an app threshold as a clinical normal range." },
  { pattern: /ignore (all|any|the) (previous|prior|above) instructions/i, reason: "The answer appears to expose or follow prompt-injection text." },
  { pattern: /system prompt|developer message|hidden instructions/i, reason: "The answer appears to expose internal prompt content." },
];

function splitClaims(answer: string): string[] {
  return answer
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12);
}

function numberTokens(value: string): string[] {
  return normalizeResearchText(value).match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
}

function groundingScore(claim: string, evidenceText: string): number {
  const claimTokens = researchTokens(claim, false);
  const evidenceTokens = new Set(researchTokens(evidenceText, false));
  if (!claimTokens.length) return 1;
  const supported = claimTokens.filter((token) => evidenceTokens.has(token)).length;
  return supported / claimTokens.length;
}

function isSafetyOrLimitationClaim(claim: string): boolean {
  return /(healthcare professional|clinician|does not diagnose|not a diagnosis|medical decision|evidence is limited|insufficient evidence|emergency services|general information)/i.test(claim);
}

export function verifyGeneratedResearchAnswer(
  answer: string,
  topics: ResearchTopic[],
  question: string
): ResearchVerification {
  for (const forbidden of FORBIDDEN_OUTPUT_PATTERNS) {
    if (forbidden.pattern.test(answer)) {
      return {
        passed: false,
        groundedClaims: 0,
        totalClaims: splitClaims(answer).length,
        citationCoverage: 0,
        blockedReason: forbidden.reason,
      };
    }
  }

  const evidenceText = topics.map((topic) => `${topic.title}. ${topic.answer}`).join(" ");
  const allowedNumbers = new Set([...numberTokens(evidenceText), ...numberTokens(question)]);
  const unknownNumbers = numberTokens(answer).filter((value) => !allowedNumbers.has(value));
  if (unknownNumbers.length > 0) {
    return {
      passed: false,
      groundedClaims: 0,
      totalClaims: splitClaims(answer).length,
      citationCoverage: 0,
      blockedReason: `The answer introduced unsupported numeric claim${unknownNumbers.length === 1 ? "" : "s"}: ${unknownNumbers.join(", ")}.`,
    };
  }

  const claims = splitClaims(answer);
  if (!claims.length) {
    return {
      passed: false,
      groundedClaims: 0,
      totalClaims: 0,
      citationCoverage: 0,
      blockedReason: "The model did not produce a complete grounded explanation.",
    };
  }

  const groundedClaims = claims.filter((claim) => isSafetyOrLimitationClaim(claim) || groundingScore(claim, evidenceText) >= 0.16).length;
  const citationCoverage = topics.length > 0 ? Math.min(1, groundedClaims / claims.length) : 0;
  const passed = groundedClaims === claims.length || (claims.length >= 3 && citationCoverage >= 0.8);

  return {
    passed,
    groundedClaims,
    totalClaims: claims.length,
    citationCoverage,
    blockedReason: passed ? undefined : "One or more generated claims were not sufficiently grounded in the retrieved evidence.",
  };
}
