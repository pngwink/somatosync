import type { ReturnStage, DecisionSupportResult } from "../types";

export const returnToLearnStage: ReturnStage = {
  pathway: "learn",
  stageNumber: 3,
  stageLabel: "Stage 3 — Partial school day with supports",
  description:
    "Attending school for a partial day with rest breaks, reduced screen time, and modified workload. Full class participation is limited until symptoms stay stable across a full day.",
  requirementsToConsider: [
    "Tolerating current cognitive load without a significant symptom increase",
    "Consistent sleep in the target range for at least 5 of the last 7 nights",
    "No symptom spike lasting more than 24 hours",
  ],
};

export const returnToPlayStage: ReturnStage = {
  pathway: "play",
  stageNumber: 2,
  stageLabel: "Stage 2 — Light aerobic activity",
  description:
    "Walking, stationary cycling, or light jogging at low intensity, with no head-impact risk or resistance training yet.",
  requirementsToConsider: [
    "No symptom increase during or after light aerobic activity",
    "Resting symptom burden staying at or below current level for 48 hours",
    "Balance assessment close to the first recorded level",
  ],
};

export const learnDecisionSupport: DecisionSupportResult = {
  pathway: "learn",
  statusLabel: "Continue at Stage 3",
  currentStage: returnToLearnStage,
  evidenceSupporting: [
    "Balance has improved to the expected recovery range",
    "Symptoms decreased over the past seven days",
    "School attendance increased without a major symptom spike",
  ],
  evidenceCaution: [
    "Reaction time is still slower than the first healthy target used in this demo",
    "Visual fatigue increases after extended screen use",
    "Headache symptoms remain mild but present",
  ],
  relatedAssessmentIds: ["res_reaction_0727", "res_symptom_0728"],
  suggestedQuestions: [
    "What signs would suggest I'm ready to move to Stage 4?",
    "Should I keep limiting screen time on school days?",
    "Is the reaction-time gap something to watch closely, or expected at this stage?",
  ],
  generatedAt: "2026-07-28T07:00:00Z",
  confidence: "moderate",
};

export const playDecisionSupport: DecisionSupportResult = {
  pathway: "play",
  statusLabel: "Remain at Stage 2",
  currentStage: returnToPlayStage,
  evidenceSupporting: [
    "No symptom increase reported after the last two light-activity sessions",
    "Resting heart rate and perceived exertion within expected range",
  ],
  evidenceCaution: [
    "Balance is close to recent results, within normal variation but worth monitoring",
    "Visual and screen tolerance has not been reassessed since starting light activity",
    "No full-contact or head-impact activity has been evaluated yet",
  ],
  relatedAssessmentIds: ["res_balance_0726"],
  suggestedQuestions: [
    "What symptoms would mean I should stop an activity session early?",
    "How is the return-to-play timeline affected by my return-to-learn stage?",
  ],
  generatedAt: "2026-07-28T07:00:00Z",
  confidence: "moderate",
};
