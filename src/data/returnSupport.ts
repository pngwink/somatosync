import type { ReturnStage, DecisionSupportResult } from "../types";

// Legacy sample content retained for compatibility with older demo components. These entries use
// function-first, non-clearance language and should never be interpreted as clinical thresholds.
export const returnToLearnStage: ReturnStage = {
  pathway: "learn",
  stageNumber: 3,
  stageLabel: "Stage 3 — Partial school day with supports",
  description:
    "Attend part of the school day with breaks or workload adjustments as needed, then build participation gradually when the current level is manageable.",
  requirementsToConsider: [
    "Current schoolwork is manageable with no more than a mild, brief symptom increase",
    "Breaks and supports are sufficient for the current school demand",
    "Daily function is gradually expanding rather than requiring more avoidance",
  ],
};

export const returnToPlayStage: ReturnStage = {
  pathway: "play",
  stageNumber: 2,
  stageLabel: "Stage 2 — Light aerobic activity",
  description:
    "Walking, stationary cycling, or other light aerobic activity with no head-impact risk, progressed gradually as tolerated.",
  requirementsToConsider: [
    "The current activity is manageable with no more than a mild, brief symptom increase",
    "Symptoms return toward the pre-activity level after the session",
    "There is no new safety concern or risk of another head impact",
  ],
};

export const learnDecisionSupport: DecisionSupportResult = {
  pathway: "learn",
  statusLabel: "Continue current learning step",
  currentStage: returnToLearnStage,
  evidenceSupporting: [
    "School participation has increased in the sample record",
    "The current supports were reported as useful during recent classes",
    "Daily function is gradually expanding",
  ],
  evidenceCaution: [
    "Longer screen sessions still provoke visual fatigue",
    "Headache remains present during some school tasks",
    "Experimental reaction-time data remains supporting context only",
  ],
  relatedAssessmentIds: ["res_reaction_0727", "res_symptom_0728"],
  suggestedQuestions: [
    "What would make the next school step manageable?",
    "Which supports can I reduce when they are no longer needed?",
    "What should I discuss with my healthcare or school team?",
  ],
  generatedAt: "2026-07-28T07:00:00Z",
  confidence: "moderate",
};

export const playDecisionSupport: DecisionSupportResult = {
  pathway: "play",
  statusLabel: "Continue current activity step",
  currentStage: returnToPlayStage,
  evidenceSupporting: [
    "Recent light activity in the sample record caused no more than a mild, brief increase",
    "Walking duration has gradually increased",
  ],
  evidenceCaution: [
    "Experimental postural-movement results should be compared only under similar conditions",
    "Unrestricted or head-impact activity requires the appropriate return-to-sport progression and clinical authorization",
  ],
  relatedAssessmentIds: ["res_balance_0726"],
  suggestedQuestions: [
    "What symptoms or safety signs mean I should reduce the activity?",
    "How does my return-to-learning status affect unrestricted sport?",
  ],
  generatedAt: "2026-07-28T07:00:00Z",
  confidence: "moderate",
};
