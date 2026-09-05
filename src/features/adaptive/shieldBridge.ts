import { getMostRecentPcssResult } from "../assessments/pcss/pcssStorage";
import { buildSupportPatterns } from "../recovery-memory/recoveryMemoryEngine";
import type { AdaptiveCheckIn, NeuroAdaptiveSettings } from "./neuroAdaptiveTypes";
import { buildAdaptivePreflightSuggestion } from "./adaptivePreflight";

export interface SomatoSyncShieldProfile {
  version: 2;
  kind: "somatosync-shield-profile";
  updatedAt: string;
  enabled: boolean;
  textScale: number;
  lineSpacing: number;
  reduceMotion: boolean;
  softContrast: boolean;
  reduceDensity: boolean;
  focusReadingLayout: boolean;
  symptomContext: AdaptiveCheckIn | null;
  learnedSupports: string[];
  recommendedChanges: string[];
  recommended: {
    textScale: number;
    lineSpacing: number;
    reduceMotion: boolean;
    softContrast: boolean;
    reduceDensity: boolean;
    focusReadingLayout: boolean;
  } | null;
}

function latestSymptomContext(): AdaptiveCheckIn | null {
  const latest = getMostRecentPcssResult();
  if (!latest) return null;
  const ratings = latest.ratings;
  const clip = (value: number) => Math.max(0, Math.min(5, Number(value) || 0));
  return {
    lightSensitivity: clip(ratings.sensitivityToLight),
    visualMotionDiscomfort: clip(Math.max(
      ratings.visualProblems,
      ratings.dizziness,
      ratings.balanceProblems,
      ratings.nausea,
    )),
    mentalFatigue: clip(Math.max(
      ratings.fatigue,
      ratings.drowsiness,
      ratings.slowedDown,
      ratings.mentallyFoggy,
      ratings.difficultyConcentrating,
    )),
  };
}

export function createShieldProfile(settings: NeuroAdaptiveSettings): SomatoSyncShieldProfile {
  const preflight = buildAdaptivePreflightSuggestion(settings);
  return {
    version: 2,
    kind: "somatosync-shield-profile",
    updatedAt: settings.updatedAt || new Date().toISOString(),
    enabled: settings.enabled,
    textScale: Math.max(1, Math.min(1.35, settings.textScale)),
    lineSpacing: Math.max(1, Math.min(1.4, settings.lineSpacing)),
    reduceMotion: settings.reduceMotion,
    softContrast: settings.softContrast,
    reduceDensity: settings.reduceDensity,
    focusReadingLayout: settings.focusReadingLayout,
    symptomContext: latestSymptomContext(),
    learnedSupports: preflight?.learnedFrom ?? buildSupportPatterns()
      .filter((pattern) => pattern.helpfulCount > 0)
      .slice(0, 3)
      .map((pattern) => pattern.title),
    recommendedChanges: preflight?.changes ?? [],
    recommended: preflight ? {
      textScale: preflight.settings.textScale,
      lineSpacing: preflight.settings.lineSpacing,
      reduceMotion: preflight.settings.reduceMotion,
      softContrast: preflight.settings.softContrast,
      reduceDensity: preflight.settings.reduceDensity,
      focusReadingLayout: preflight.settings.focusReadingLayout,
    } : null,
  };
}

export function broadcastShieldProfile(settings: NeuroAdaptiveSettings) {
  if (typeof window === "undefined") return;
  window.postMessage({
    source: "somatosync-app",
    type: "SOMATOSYNC_SHIELD_PROFILE",
    payload: createShieldProfile(settings),
  }, window.location.origin);
}

export function requestShieldStatus() {
  if (typeof window === "undefined") return;
  window.postMessage({ source: "somatosync-app", type: "SOMATOSYNC_SHIELD_PING" }, window.location.origin);
}
