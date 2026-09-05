import { buildSupportPatterns } from "../recovery-memory/recoveryMemoryEngine";
import type { AdaptiveCheckIn, NeuroAdaptiveSettings } from "./neuroAdaptiveTypes";
import { buildAdaptivePreflightSuggestion } from "./adaptivePreflight";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";

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
  calmMedia: boolean;
  stabilizeViewport: boolean;
  emphasizeStructure: boolean;
  photophobiaMode: boolean;
  readingSpotlight: boolean;
  pauseMedia: boolean;
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
    calmMedia: boolean;
    stabilizeViewport: boolean;
    emphasizeStructure: boolean;
    photophobiaMode: boolean;
    readingSpotlight: boolean;
    pauseMedia: boolean;
  } | null;
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
    calmMedia: settings.calmMedia,
    stabilizeViewport: settings.stabilizeViewport,
    emphasizeStructure: settings.emphasizeStructure,
    photophobiaMode: settings.photophobiaMode,
    readingSpotlight: settings.readingSpotlight,
    pauseMedia: settings.pauseMedia,
    symptomContext: getCurrentAdaptiveCheckIn(),
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
      calmMedia: preflight.settings.calmMedia,
      stabilizeViewport: preflight.settings.stabilizeViewport,
      emphasizeStructure: preflight.settings.emphasizeStructure,
      photophobiaMode: preflight.settings.photophobiaMode,
      readingSpotlight: preflight.settings.readingSpotlight,
      pauseMedia: preflight.settings.pauseMedia,
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
