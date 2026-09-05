import type { ResultTone } from "../../types";
import { loadBalanceHistory } from "../assessments/balance/balanceStorage";
import { loadMemoryHistory } from "../assessments/memory/memoryStorage";
import { loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { loadReactionHistory } from "../assessments/reaction/reactionStorage";
import { loadProtocolLogs } from "../protocols/protocolEngine";
import { loadAdaptiveSessions } from "../adaptive/neuroAdaptiveStorage";
import { detectUnexpectedRecoveryChanges, type RecoveryChangeAlert } from "./changeDetection";

export type EvidenceDirection = "improving" | "similar" | "worsening" | "starting" | "unavailable";

export interface DomainEvidence {
  id: "symptoms" | "reaction" | "memory" | "balance" | "activity" | "focus";
  label: string;
  direction: EvidenceDirection;
  headline: string;
  detail: string;
  tone: ResultTone;
  sampleCount: number;
}

export interface RecoveryEvidenceSummary {
  overallLabel: string;
  overallDetail: string;
  overallTone: ResultTone;
  domains: DomainEvidence[];
  improvingCount: number;
  worseningCount: number;
  measuredCount: number;
  changeAlerts?: RecoveryChangeAlert[];
  generatedAt: string;
}

function changeDirection(percentImproved: number | null, threshold = 8): EvidenceDirection {
  if (percentImproved == null) return "starting";
  if (percentImproved >= threshold) return "improving";
  if (percentImproved <= -threshold) return "worsening";
  return "similar";
}

function toneFor(direction: EvidenceDirection): ResultTone {
  if (direction === "improving") return "positive";
  if (direction === "worsening") return "caution";
  if (direction === "similar") return "info";
  return "neutral";
}

function latestAndOldest<T extends { completedAt: string }>(values: T[]) {
  const sorted = [...values].sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  return { oldest: sorted[0] ?? null, latest: sorted[sorted.length - 1] ?? null };
}

export function buildRecoveryEvidenceSummary(): RecoveryEvidenceSummary {
  const domains: DomainEvidence[] = [];

  const pcss = loadPcssHistory();
  if (pcss.length > 0) {
    const { oldest, latest } = latestAndOldest(pcss);
    const percent = oldest && latest && oldest.id !== latest.id && oldest.totalSeverity > 0
      ? ((oldest.totalSeverity - latest.totalSeverity) / oldest.totalSeverity) * 100
      : null;
    const direction = changeDirection(percent);
    domains.push({
      id: "symptoms",
      label: "Reported symptoms",
      direction,
      headline:
        direction === "improving" ? "Symptom burden is trending lower" :
        direction === "worsening" ? "Symptom burden is trending higher" :
        direction === "similar" ? "Symptom burden is broadly similar" :
        "First symptom starting point recorded",
      detail: oldest && latest && oldest.id !== latest.id
        ? `PCSS severity changed from ${oldest.totalSeverity} to ${latest.totalSeverity} across ${pcss.length} entries.`
        : `PCSS severity is ${latest?.totalSeverity ?? 0} of 132. More entries are needed to establish a trend.`,
      tone: toneFor(direction),
      sampleCount: pcss.length,
    });
  } else {
    domains.push({
      id: "symptoms",
      label: "Reported symptoms",
      direction: "unavailable",
      headline: "No symptom assessment yet",
      detail: "Complete the PCSS-format symptom assessment to begin this domain.",
      tone: "neutral",
      sampleCount: 0,
    });
  }

  const reaction = loadReactionHistory().filter((item) => item.medianMs != null);
  if (reaction.length > 0) {
    const { oldest, latest } = latestAndOldest(reaction);
    const percent = oldest?.medianMs && latest?.medianMs && oldest.id !== latest.id
      ? ((oldest.medianMs - latest.medianMs) / oldest.medianMs) * 100
      : null;
    const direction = changeDirection(percent, 7);
    domains.push({
      id: "reaction",
      label: "Reaction time · experimental",
      direction,
      headline:
        direction === "improving" ? "Reaction time is faster than the starting session" :
        direction === "worsening" ? "Reaction time is slower than the starting session" :
        direction === "similar" ? "Reaction time is within a similar range" :
        "First reaction-time starting point recorded",
      detail: oldest?.medianMs && latest?.medianMs && oldest.id !== latest.id
        ? `Median reaction time changed from ${Math.round(oldest.medianMs)} ms to ${Math.round(latest.medianMs)} ms across ${reaction.length} sessions.`
        : `Latest median is ${Math.round(latest?.medianMs ?? 0)} ms. This browser task is a trend measure, not a diagnostic test.`,
      tone: toneFor(direction),
      sampleCount: reaction.length,
    });
  } else {
    domains.push({
      id: "reaction",
      label: "Reaction time · experimental",
      direction: "unavailable",
      headline: "No reaction-time assessment yet",
      detail: "Complete a reaction task to begin this domain.",
      tone: "neutral",
      sampleCount: 0,
    });
  }

  const memory = loadMemoryHistory();
  if (memory.length > 0) {
    const { oldest, latest } = latestAndOldest(memory);
    const change = oldest && latest && oldest.id !== latest.id ? latest.delayedCorrect - oldest.delayedCorrect : null;
    const percent = change == null ? null : change * 10;
    const direction = changeDirection(percent, 10);
    domains.push({
      id: "memory",
      label: "Learning & recall · experimental",
      direction,
      headline:
        direction === "improving" ? "Delayed recall increased" :
        direction === "worsening" ? "Delayed recall decreased" :
        direction === "similar" ? "Delayed recall is broadly similar" :
        "First memory starting point recorded",
      detail: oldest && latest && oldest.id !== latest.id
        ? `Delayed recall changed from ${oldest.delayedCorrect} to ${latest.delayedCorrect} of 10 words across ${memory.length} sessions.`
        : `Latest delayed recall is ${latest?.delayedCorrect ?? 0} of 10 words. Rotating lists reduce practice effects but do not eliminate them.`,
      tone: toneFor(direction),
      sampleCount: memory.length,
    });
  } else {
    domains.push({
      id: "memory",
      label: "Learning & recall · experimental",
      direction: "unavailable",
      headline: "No memory task yet",
      detail: "Complete a learning-and-delayed-recall task to begin this domain.",
      tone: "neutral",
      sampleCount: 0,
    });
  }

  const balance = loadBalanceHistory().filter((item) => item.trackingQualityPercent >= 60);
  if (balance.length > 0) {
    const { oldest, latest } = latestAndOldest(balance);
    const percent = oldest && latest && oldest.id !== latest.id && oldest.lateralRmsPercent > 0
      ? ((oldest.lateralRmsPercent - latest.lateralRmsPercent) / oldest.lateralRmsPercent) * 100
      : null;
    const direction = changeDirection(percent, 12);
    domains.push({
      id: "balance",
      label: "Postural movement · experimental",
      direction,
      headline:
        direction === "improving" ? "Recorded lateral movement decreased" :
        direction === "worsening" ? "Recorded lateral movement increased" :
        direction === "similar" ? "Recorded lateral movement is broadly similar" :
        "First postural-movement recording available",
      detail: oldest && latest && oldest.id !== latest.id
        ? `Lateral movement changed from ${oldest.lateralRmsPercent.toFixed(2)}% to ${latest.lateralRmsPercent.toFixed(2)}% of frame width across ${balance.length} comparable recordings.`
        : `Latest movement band is ${latest?.movementBand ?? "unavailable"}. Compare only recordings made under similar camera and stance conditions.`,
      tone: toneFor(direction),
      sampleCount: balance.length,
    });
  } else {
    domains.push({
      id: "balance",
      label: "Postural movement · experimental",
      direction: "unavailable",
      headline: "No usable postural-movement recording yet",
      detail: "Complete an optional well-lit postural-movement recording to begin this experimental trend.",
      tone: "neutral",
      sampleCount: 0,
    });
  }


  const activityLogs = loadProtocolLogs();
  if (activityLogs.length > 0) {
    const responseRank = { "significant-prolonged": 0, "mild-brief": 1, tolerated: 2 } as const;
    const latest = activityLogs[0];
    const previous = activityLogs[1] ?? null;
    const direction: EvidenceDirection = previous
      ? responseRank[latest.response] > responseRank[previous.response]
        ? "improving"
        : responseRank[latest.response] < responseRank[previous.response]
          ? "worsening"
          : "similar"
      : "starting";
    const tolerated = activityLogs.filter((log) => log.response === "tolerated").length;
    const prolonged = activityLogs.filter((log) => log.response === "significant-prolonged").length;
    domains.push({
      id: "activity",
      label: "Activity tolerance",
      direction,
      headline:
        latest.response === "tolerated" ? "Latest activity was recorded as tolerated" :
        latest.response === "mild-brief" ? "Latest activity caused a mild, brief symptom increase" :
        "Latest activity caused a significant or prolonged symptom increase",
      detail: `${activityLogs.length} activities recorded: ${tolerated} tolerated and ${prolonged} with significant or prolonged symptom increase. Latest: ${latest.activityLabel}.`,
      tone: latest.response === "significant-prolonged" ? "caution" : toneFor(direction),
      sampleCount: activityLogs.length,
    });
  } else {
    domains.push({
      id: "activity",
      label: "Activity tolerance",
      direction: "unavailable",
      headline: "No activity-response log yet",
      detail: "Log a school, work, daily-life, or physical activity to show how symptoms respond to real-world demands.",
      tone: "neutral",
      sampleCount: 0,
    });
  }

  const focusSessions = loadAdaptiveSessions();
  if (focusSessions.length > 0) {
    const sorted = [...focusSessions].sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
    const oldest = sorted[0];
    const latest = sorted[sorted.length - 1];
    const percent = oldest.id !== latest.id && oldest.maxStrainScore > 0
      ? ((oldest.maxStrainScore - latest.maxStrainScore) / oldest.maxStrainScore) * 100
      : null;
    const direction = changeDirection(percent, 15);
    const confirmed = focusSessions.filter((session) => session.userConfirmedPrompt === true).length;
    const adaptationCounts = new Map<string, number>();
    focusSessions.flatMap((session) => session.adaptationsApplied).forEach((item) => adaptationCounts.set(item, (adaptationCounts.get(item) ?? 0) + 1));
    const mostUsed = [...adaptationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No adaptation recorded";
    domains.push({
      id: "focus",
      label: "Focus interaction patterns · experimental",
      direction,
      headline:
        direction === "improving" ? "Fewer interaction-difficulty patterns were recorded" :
        direction === "worsening" ? "More interaction-difficulty patterns were recorded" :
        direction === "similar" ? "Interaction-difficulty patterns were broadly similar" :
        "First Focus Mode session recorded",
      detail: `${focusSessions.length} Focus Mode sessions include ${confirmed} user-confirmed alerts. Most-used support: ${mostUsed}. These are non-diagnostic session patterns.`,
      tone: toneFor(direction),
      sampleCount: focusSessions.length,
    });
  } else {
    domains.push({
      id: "focus",
      label: "Focus interaction patterns · experimental",
      direction: "unavailable",
      headline: "No Focus Mode session yet",
      detail: "Focus Mode can record aggregate pacing signals and which accessibility adaptations the user found useful.",
      tone: "neutral",
      sampleCount: 0,
    });
  }

  const measured = domains.filter((domain) => domain.direction !== "unavailable");
  const improvingCount = measured.filter((domain) => domain.direction === "improving").length;
  const worseningCount = measured.filter((domain) => domain.direction === "worsening").length;

  let overallLabel = "Tracked domains stay separate";
  let overallDetail = "SomatoSync does not combine symptoms, function, or experimental tasks into a recovery or readiness score.";
  let overallTone: ResultTone = "neutral";

  if (measured.length >= 2) {
    if (worseningCount >= 2) {
      overallLabel = "Several tracked domains changed";
      overallDetail = `${worseningCount} tracked domains moved in a less favorable direction. Experimental task changes are context only; this is a follow-up signal, not a diagnosis or recovery prediction.`;
      overallTone = "caution";
    } else if (improvingCount >= 2 && worseningCount === 0) {
      overallLabel = "Several tracked domains changed favorably";
      overallDetail = `${improvingCount} tracked domains changed in a favorable direction. This does not mean a percentage recovered or medical readiness, and experimental trends remain supporting context only.`;
      overallTone = "positive";
    } else {
      overallLabel = "Mixed or stable tracked domains";
      overallDetail = "The domains do not all move together. SomatoSync keeps symptoms, function, and experimental trends separate so one result cannot define recovery.";
      overallTone = "info";
    }
  }

  return {
    overallLabel,
    overallDetail,
    overallTone,
    domains,
    improvingCount,
    worseningCount,
    measuredCount: measured.length,
    changeAlerts: detectUnexpectedRecoveryChanges(),
    generatedAt: new Date().toISOString(),
  };
}
