import type { ResultTone } from "../../types";
import { loadBalanceHistory } from "../assessments/balance/balanceStorage";
import { loadMemoryHistory } from "../assessments/memory/memoryStorage";
import { loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { loadReactionHistory } from "../assessments/reaction/reactionStorage";
import { buildRecoveryEvidenceSummary } from "../recovery/evidenceSummary";
import { daysSinceInjury, type RecoveryProfile } from "../recovery/recoveryProfile";

export interface OutlookSignal {
  id: string;
  title: string;
  detail: string;
  tone: ResultTone;
  sourceIds: string[];
}

export interface RecoveryOutlook {
  phaseLabel: string;
  daysPostInjury: number | null;
  summary: string;
  summaryTone: ResultTone;
  signals: OutlookSignal[];
  dataCoverage: string;
  noDateReason: string;
  generatedAt: string;
}

function recentTrend<T extends { completedAt: string }>(
  values: T[],
  metric: (value: T) => number,
  lowerIsBetter: boolean,
  thresholdPercent: number
): "improving" | "worsening" | "similar" | "insufficient" {
  if (values.length < 2) return "insufficient";
  const sorted = [...values].sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  const first = metric(sorted[Math.max(0, sorted.length - 3)]);
  const latest = metric(sorted[sorted.length - 1]);
  if (!Number.isFinite(first) || !Number.isFinite(latest) || first === 0) return "insufficient";
  const rawPercent = ((latest - first) / Math.abs(first)) * 100;
  const improvementPercent = lowerIsBetter ? -rawPercent : rawPercent;
  if (improvementPercent >= thresholdPercent) return "improving";
  if (improvementPercent <= -thresholdPercent) return "worsening";
  return "similar";
}

export function buildRecoveryOutlook(profile: RecoveryProfile, now = new Date()): RecoveryOutlook {
  const days = daysSinceInjury(profile, now);
  const pcss = loadPcssHistory();
  const reactions = loadReactionHistory().filter((item) => item.medianMs != null);
  const memories = loadMemoryHistory();
  const balances = loadBalanceHistory().filter((item) => item.trackingQualityPercent >= 60);
  const evidence = buildRecoveryEvidenceSummary();
  const latestPcss = pcss[0] ?? null;
  const oldestPcss = [...pcss].sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1))[0] ?? null;
  const signals: OutlookSignal[] = [];

  let phaseLabel = "Injury date not entered";
  if (days != null) {
    if (days <= 2) phaseLabel = "First 24–48 hours";
    else if (days < 14) phaseLabel = "Early recovery phase";
    else if (days < 28) phaseLabel = "Follow-up window";
    else phaseLabel = "Persisting-symptom review window";
  }

  if (days != null && days >= 28 && latestPcss && latestPcss.totalSeverity > 0) {
    signals.push({
      id: "persisting-threshold",
      title: "Symptoms are recorded beyond four weeks",
      detail: "Current guidelines use symptoms lasting more than four weeks as a reason for multimodal clinical evaluation and targeted follow-up. This is a timing flag, not a diagnosis of a syndrome.",
      tone: "risk",
      sourceIds: ["amsterdam-2022", "ontario-prolonged", "peds-guideline"],
    });
  } else if (days != null && days >= 14 && latestPcss && oldestPcss && pcss.length >= 2) {
    const symptomChange = oldestPcss.totalSeverity > 0
      ? ((oldestPcss.totalSeverity - latestPcss.totalSeverity) / oldestPcss.totalSeverity) * 100
      : 0;
    if (symptomChange < 10) {
      signals.push({
        id: "symptom-plateau",
        title: "Symptom improvement is limited so far",
        detail: `The app’s prototype trend rule found less than a 10% decrease from the first PCSS entry (${oldestPcss.totalSeverity}) to the latest (${latestPcss.totalSeverity}). This is not a clinical cutoff; consider sharing the pattern if daily function is not progressively improving.`,
        tone: "caution",
        sourceIds: ["amsterdam-2022", "ontario-prolonged"],
      });
    }
  }

  if (latestPcss) {
    const sleepLoad = latestPcss.categoryTotals.sleep;
    if (sleepLoad >= 6) {
      signals.push({
        id: "sleep-signal",
        title: "Sleep and fatigue symptoms deserve attention",
        detail: `The latest sleep-domain total is ${sleepLoad}. The app uses 6 as a prototype attention threshold—not a clinical cutoff—because sleep disturbance can affect cognition, mood, and activity tolerance. It does not estimate an individual timeline.`,
        tone: "caution",
        sourceIds: ["amsterdam-2022", "ontario-prolonged", "peds-guideline"],
      });
    }
  }

  const cognitiveTrends = [
    recentTrend(reactions, (item) => item.medianMs ?? 0, true, 8),
    recentTrend(memories, (item) => item.delayedCorrect, false, 10),
  ];
  const objectiveWorseningCount = cognitiveTrends.filter((trend) => trend === "worsening").length;
  const balanceTrend = recentTrend(balances, (item) => item.lateralRmsPercent, true, 12);
  const multidomainWorsening = objectiveWorseningCount + (balanceTrend === "worsening" ? 1 : 0);

  if (multidomainWorsening >= 2) {
    signals.push({
      id: "multidomain-decline",
      title: "More than one measured domain declined",
      detail: `At least two measured domains crossed the app’s within-person change rules (reaction 8%, memory 10%, balance 12%). These are transparent prototype thresholds, not validated prognostic cutoffs, but a repeated multidomain pattern is reasonable to share during follow-up.`,
      tone: "caution",
      sourceIds: ["amsterdam-2022", "ontario-prolonged"],
    });
  }

  const contextLabels: string[] = [];
  if (profile.riskContext.priorConcussions) contextLabels.push("prior concussion history");
  if (profile.riskContext.headacheHistory) contextLabels.push("pre-injury headache history");
  if (profile.riskContext.sleepHistory) contextLabels.push("pre-injury sleep difficulty");
  if (profile.riskContext.mentalHealthHistory) contextLabels.push("mental-health history");
  if (profile.riskContext.learningAttentionNeeds) contextLabels.push("learning or attention support needs");
  if (profile.riskContext.neckInjury) contextLabels.push("neck injury with this event");
  if (profile.riskContext.lossOfConsciousness) contextLabels.push("reported loss of consciousness");

  if (contextLabels.length > 0) {
    signals.push({
      id: "context-risk",
      title: "Optional context suggests closer monitoring may be useful",
      detail: `You selected ${contextLabels.join(", ")}. These factors are associated with recovery variability in research, but SomatoSync does not turn them into a probability or predicted date.`,
      tone: "info",
      sourceIds: ["ontario-prolonged"],
    });
  }

  if (signals.length === 0 && evidence.measuredCount > 0) {
    signals.push({
      id: "no-follow-up-signal",
      title: "No strong follow-up flag from the recorded data",
      detail: "The available entries do not currently cross the app’s timing or multidomain follow-up rules. This does not mean recovery is complete or that medical clearance has been reached.",
      tone: "positive",
      sourceIds: ["amsterdam-2022", "ontario-prolonged"],
    });
  }

  if (evidence.measuredCount === 0) {
    signals.push({
      id: "insufficient-data",
      title: "Not enough recorded information",
      detail: "Add an injury date and complete symptom or cognitive assessments before the app can identify follow-up windows and trend signals.",
      tone: "neutral",
      sourceIds: [],
    });
  }

  let summary = "SomatoSync does not predict an exact recovery date.";
  let summaryTone: ResultTone = "info";
  if (signals.some((signal) => signal.tone === "risk")) {
    summary = "Recorded timing and symptoms support prompt clinical follow-up.";
    summaryTone = "risk";
  } else if (signals.some((signal) => signal.tone === "caution")) {
    summary = "The record contains patterns worth discussing or rechecking.";
    summaryTone = "caution";
  } else if (evidence.improvingCount >= 2 && evidence.worseningCount === 0) {
    summary = "Several domains are improving, but no exact timeline can be inferred.";
    summaryTone = "positive";
  }

  const totalEntries = pcss.length + reactions.length + memories.length + balances.length;
  const dataCoverage = `${totalEntries} assessment entries across ${evidence.measuredCount} recorded domains.`;
  const noDateReason = profile.ageGroup === "child-teen"
    ? "Pediatric recovery varies by symptoms, function, age, history, and activity demands; self-reported and browser-task data cannot safely produce a personal date."
    : "Recovery varies by symptoms, function, history, and activity demands; self-reported and browser-task data cannot safely produce a personal date.";

  return {
    phaseLabel,
    daysPostInjury: days,
    summary,
    summaryTone,
    signals,
    dataCoverage,
    noDateReason,
    generatedAt: new Date().toISOString(),
  };
}
