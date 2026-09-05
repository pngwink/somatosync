import { pcssSymptoms } from "../assessments/pcss/pcssData";
import { loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { loadReactionHistory } from "../assessments/reaction/reactionStorage";
import { loadMemoryHistory } from "../assessments/memory/memoryStorage";
import { loadBalanceHistory } from "../assessments/balance/balanceStorage";
import { loadAdaptiveSessions } from "../adaptive/neuroAdaptiveStorage";
import { loadRecoveryMemoryEvents, saveRecoveryMemoryEvent, updateAdaptiveResponseEvent } from "./recoveryMemoryStorage";
import type { AdaptiveCheckIn } from "../adaptive/neuroAdaptiveTypes";
import type { AdaptiveResponseEvent, AdaptiveResponseOutcome, RecoveryStoryItem, SupportPattern } from "./recoveryMemoryTypes";

export const CONTEXT_OPTIONS = [
  "School or homework",
  "Screens or reading",
  "Physical activity",
  "Driving or transportation",
  "Bright environment",
  "Noisy environment",
] as const;

export function latestRecoveryContexts(): string[] {
  const recentManual = loadRecoveryMemoryEvents().find((event) => {
    if (event.kind !== "context-note") return false;
    return Date.now() - new Date(event.completedAt).getTime() <= 4 * 60 * 60 * 1000;
  });
  const checkInContexts = loadPcssHistory()[0]?.activityContexts ?? [];
  return [...new Set([...(recentManual?.kind === "context-note" ? recentManual.contexts : []), ...checkInContexts])].slice(0, 4);
}

export function beginAdaptiveResponse(args: {
  checkIn: AdaptiveCheckIn;
  triggerReasons: string[];
  changes: string[];
  beforeStrainScore: number | null;
  source?: "site-wide" | "guided-session";
}): AdaptiveResponseEvent {
  const event: AdaptiveResponseEvent = {
    id: `response_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "adaptive-response",
    startedAt: new Date().toISOString(),
    contexts: latestRecoveryContexts(),
    checkIn: args.checkIn,
    triggerReasons: args.triggerReasons.slice(0, 4),
    changes: [...new Set(args.changes)].slice(0, 7),
    beforeStrainScore: args.beforeStrainScore,
    afterStrainScore: null,
    outcome: "pending",
    source: args.source ?? "site-wide",
  };
  saveRecoveryMemoryEvent(event);
  return event;
}

export function finishAdaptiveResponse(id: string, before: number | null, after: number | null, forcedOutcome?: AdaptiveResponseOutcome) {
  let outcome: AdaptiveResponseOutcome = forcedOutcome ?? "not-enough-data";
  if (!forcedOutcome && before != null && after != null) {
    const meaningful = Math.max(6, before * 0.12);
    if (before - after >= meaningful) outcome = "appeared-helpful";
    else if (after - before >= meaningful) outcome = "strain-increased";
    else outcome = "no-clear-change";
  }
  updateAdaptiveResponseEvent(id, {
    completedAt: new Date().toISOString(),
    afterStrainScore: after,
    outcome,
  });
}

function supportBuckets(changes: string[]) {
  const buckets: string[] = [];
  if (changes.some((item) => item === "Larger text" || item === "More line spacing" || item === "Focused reading width")) buckets.push("Readability adjustments");
  if (changes.includes("Softer contrast")) buckets.push("Softer visuals");
  if (changes.includes("Reduced motion")) buckets.push("Reduced motion");
  if (changes.some((item) => item === "Less secondary detail" || item === "Read-aloud support")) buckets.push("Lower reading load");
  return buckets.length > 0 ? buckets : [changes[0] ?? "Adaptive support"];
}

export function buildSupportPatterns(): SupportPattern[] {
  const buckets = new Map<string, { helpful: number; observed: number }>();
  for (const event of loadRecoveryMemoryEvents()) {
    if (event.kind === "adaptive-response") {
      if (event.outcome === "pending" || event.outcome === "reverted" || event.outcome === "not-enough-data") continue;
      for (const bucket of supportBuckets(event.changes)) {
        const current = buckets.get(bucket) ?? { helpful: 0, observed: 0 };
        current.observed += 1;
        if (event.outcome === "appeared-helpful") current.helpful += 1;
        buckets.set(bucket, current);
      }
      continue;
    }
    if (event.kind === "caregiver-feedback") {
      for (const response of event.responses) {
        if (!response.provided || response.response === "not-sure" || response.response == null) continue;
        const bucket = response.patternTitle || response.title;
        const current = buckets.get(bucket) ?? { helpful: 0, observed: 0 };
        current.observed += 1;
        if (response.response === "helped") current.helpful += 1;
        buckets.set(bucket, current);
      }
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1].helpful - a[1].helpful || b[1].observed - a[1].observed)
    .slice(0, 3)
    .map(([title, stats]) => ({
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      helpfulCount: stats.helpful,
      observedCount: stats.observed,
      detail: stats.observed === 1
        ? stats.helpful === 1
          ? "One recent follow-up or support report was followed by better tolerance."
          : "SomatoSync has one follow-up so far and is still learning the pattern."
        : stats.helpful > 0
          ? `${stats.helpful} of ${stats.observed} recent follow-ups or support reports were followed by better tolerance.`
          : `${stats.observed} recent follow-ups have not shown a consistent change yet.`,
    }));
}

function topSymptoms(result: ReturnType<typeof loadPcssHistory>[number]) {
  return pcssSymptoms
    .map((symptom) => ({ label: symptom.label, value: result.ratings[symptom.id] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => `${item.label} ${item.value}/6`)
    .join(" · ");
}

function responseDetail(event: AdaptiveResponseEvent) {
  const trigger = event.triggerReasons.slice(0, 2).join(" + ") || "Sustained reading-strain pattern";
  const support = supportBuckets(event.changes).slice(0, 2).join(" + ");
  const response = event.outcome === "appeared-helpful"
    ? "observed strain settled afterward"
    : event.outcome === "strain-increased"
      ? "strain remained elevated afterward"
      : event.outcome === "reverted"
        ? "support was undone before follow-up"
        : event.outcome === "pending"
          ? "watching what happens next"
          : "no clear follow-up change yet";
  return `${trigger} → ${support} → ${response}`;
}


function toleranceDetail(
  pre: { headache: number; dizziness: number; concentrationDifficulty: number; fatigue: number } | undefined,
  post: { headache: number; dizziness: number; concentrationDifficulty: number; fatigue: number } | undefined,
  keys: Array<"headache" | "dizziness" | "concentrationDifficulty" | "fatigue">,
) {
  if (!pre || !post) return "";
  const labels = { headache: "headache", dizziness: "dizziness", concentrationDifficulty: "concentration", fatigue: "fatigue" } as const;
  const changed = keys
    .map((key) => ({ key, delta: post[key] - pre[key] }))
    .filter((item) => item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);
  if (changed.length === 0) return " · symptoms stable during task";
  return ` · task tolerance: ${changed.map((item) => `${labels[item.key]} ${item.delta > 0 ? "+" : ""}${item.delta}`).join(", ")}`;
}

export function buildRecoveryStory(): RecoveryStoryItem[] {
  const items: RecoveryStoryItem[] = [];

  for (const event of loadRecoveryMemoryEvents()) {
    if (event.kind === "adaptive-response") {
      items.push({
        id: event.id,
        completedAt: event.completedAt ?? event.startedAt,
        title: "Reading environment adapted",
        detail: responseDetail(event),
        contexts: event.contexts,
        tone: event.outcome === "appeared-helpful" ? "positive" : event.outcome === "strain-increased" ? "caution" : "neutral",
      });
    } else {
      items.push({ id: event.id, completedAt: event.completedAt, title: "Context added", detail: event.note || event.contexts.join(" · "), contexts: event.contexts, tone: "neutral" });
    }
  }

  for (const event of loadRecoveryMemoryEvents()) {
    if (event.kind !== "caregiver-feedback") continue;
    const provided = event.responses.filter((item) => item.provided);
    const helpful = provided.filter((item) => item.response === "helped");
    const audience = event.audience === "teacher" ? "Teacher / school" : event.audience === "coach" ? "Coach / trainer" : "Parent / caregiver";
    const detail = provided.length === 0
      ? `${audience} reported that the shared supports were not provided.`
      : helpful.length > 0
        ? `${audience} reported ${helpful.length} of ${provided.length} provided support${provided.length === 1 ? "" : "s"} seemed helpful.`
        : `${audience} reported on ${provided.length} provided support${provided.length === 1 ? "" : "s"}; no clear helpful pattern was confirmed.`;
    items.push({ id: event.id, completedAt: event.completedAt, title: "Support feedback", detail, tone: helpful.length > 0 ? "positive" : "neutral" });
  }

  for (const result of loadPcssHistory().slice(0, 5)) {
    items.push({
      id: result.id,
      completedAt: result.completedAt,
      title: result.source === "voice" ? "Voice check-in" : "Symptom check-in",
      detail: topSymptoms(result) || "No symptoms were rated above zero.",
      contexts: result.activityContexts,
      tone: "neutral",
    });
  }

  for (const result of loadReactionHistory().slice(0, 2)) {
    items.push({ id: result.id, completedAt: result.completedAt, title: "Reaction assessment", detail: result.medianMs == null ? "Session completed without enough valid trials for a median." : `Median reaction time: ${Math.round(result.medianMs)} ms.`, tone: "neutral" });
  }
  for (const result of loadMemoryHistory().slice(0, 2)) {
    items.push({ id: result.id, completedAt: result.completedAt, title: "Memory assessment", detail: `Delayed recall: ${result.delayedCorrect} of 10 words${toleranceDetail(result.preTolerance, result.postTolerance, ["headache", "concentrationDifficulty", "fatigue"])}.`, tone: "neutral" });
  }
  for (const result of loadBalanceHistory().slice(0, 2)) {
    items.push({ id: result.id, completedAt: result.completedAt, title: "Postural-movement assessment", detail: `Recorded movement: ${result.lateralRmsPercent.toFixed(2)}% of frame width${toleranceDetail(result.preTolerance, result.postTolerance, ["headache", "dizziness", "fatigue"])}.`, tone: "neutral" });
  }
  for (const session of loadAdaptiveSessions().filter((item) => item.source === "guided-session").slice(0, 2)) {
    const supports = session.adaptationsApplied.length > 0 ? [...new Set(session.adaptationsApplied)].slice(0, 3).join(" · ") : "No display support was applied.";
    items.push({ id: `focus_${session.id}`, completedAt: session.completedAt, title: "Focus session", detail: supports, tone: session.userConfirmedPrompt ? "positive" : "neutral" });
  }

  return items.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 8);
}
