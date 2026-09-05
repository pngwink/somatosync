import { buildSupportPatterns } from "../recovery-memory/recoveryMemoryEngine";
import type { NeuroAdaptiveSettings } from "./neuroAdaptiveTypes";
import { getActiveDataScope } from "../../lib/session";

export interface AdaptivePreflightSuggestion {
  title: string;
  detail: string;
  learnedFrom: string[];
  settings: NeuroAdaptiveSettings;
  changes: string[];
}

function stronger(current: number, next: number) {
  return Math.max(current, next);
}

export function buildAdaptivePreflightSuggestion(current: NeuroAdaptiveSettings): AdaptivePreflightSuggestion | null {
  let patterns = buildSupportPatterns()
    .filter((pattern) => pattern.helpfulCount > 0 && pattern.helpfulCount / Math.max(1, pattern.observedCount) >= 0.6)
    .slice(0, 3);

  if (patterns.length === 0 && getActiveDataScope() === "demo") {
    patterns = [
      { id: "readability", title: "Readability adjustments", detail: "Demo pattern", helpfulCount: 3, observedCount: 4 },
      { id: "lower-reading-load", title: "Lower reading load", detail: "Demo pattern", helpfulCount: 2, observedCount: 3 },
    ];
  }

  if (patterns.length === 0) return null;

  let settings: NeuroAdaptiveSettings = { ...current, enabled: true };
  const changes = new Set<string>();

  for (const pattern of patterns) {
    if (pattern.title === "Readability adjustments") {
      settings = {
        ...settings,
        textScale: stronger(settings.textScale, 1.14),
        lineSpacing: stronger(settings.lineSpacing, 1.12),
        focusReadingLayout: true,
      };
      changes.add("Larger text");
      changes.add("More line spacing");
      changes.add("Focused reading width");
    }
    if (pattern.title === "Softer visuals") {
      settings = { ...settings, softContrast: true };
      changes.add("Softer contrast");
    }
    if (pattern.title === "Reduced motion") {
      settings = { ...settings, reduceMotion: true };
      changes.add("Reduced motion");
    }
    if (pattern.title === "Lower reading load") {
      settings = { ...settings, reduceDensity: true, focusReadingLayout: true };
      changes.add("Less secondary detail");
      changes.add("Focused reading width");
    }
  }

  if (changes.size === 0) return null;
  settings = {
    ...settings,
    profile: settings.textToSpeechPreferred ? "audio-first" : "reduced-stimulation",
    updatedAt: new Date().toISOString(),
  };

  const names = patterns.map((pattern) => pattern.title);
  return {
    title: "Use your recent reading setup?",
    detail: names.length === 1
      ? `${names[0]} has been followed by better tolerance in recent sessions.`
      : `${names.slice(0, 2).join(" and ")} have been followed by better tolerance in recent sessions.`,
    learnedFrom: names,
    settings,
    changes: [...changes],
  };
}
