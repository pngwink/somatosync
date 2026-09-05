import { getActiveDataScope } from "../../lib/session";
import type { NeuroAdaptiveSessionSummary, NeuroAdaptiveSettings, PersonalizationModel } from "./neuroAdaptiveTypes";

const defaultWeights: PersonalizationModel["weights"] = {
  blinkRateBpm: 0.14,
  browTension: 0.16,
  faceScale: 0.18,
  headMotion: 0.14,
  gazeDeviation: 0.14,
  scrollReversalsPerMinute: 0.14,
  idleRatio: 0.1,
};

export const DEFAULT_ADAPTIVE_SETTINGS: NeuroAdaptiveSettings = {
  enabled: false,
  profile: "standard",
  textScale: 1,
  lineSpacing: 1,
  reduceMotion: false,
  softContrast: false,
  textToSpeechPreferred: false,
  reduceDensity: false,
  focusReadingLayout: false,
  calmMedia: false,
  stabilizeViewport: false,
  emphasizeStructure: false,
  autoAdapt: false,
  updatedAt: new Date(0).toISOString(),
};

export const DEFAULT_PERSONALIZATION_MODEL: PersonalizationModel = {
  thresholdOffset: 0,
  weights: defaultWeights,
  confirmations: 0,
  rejections: 0,
  updatedAt: new Date(0).toISOString(),
};

function key(suffix: string) {
  return `somatosync.${getActiveDataScope()}.neuro-adaptive.${suffix}.v1`;
}

function readJson<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storageKey: string, value: unknown) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // The feature continues in-memory if storage is unavailable.
  }
}

export function loadAdaptiveSettings(): NeuroAdaptiveSettings {
  return readJson(key("settings"), DEFAULT_ADAPTIVE_SETTINGS);
}

export function saveAdaptiveSettings(settings: NeuroAdaptiveSettings) {
  writeJson(key("settings"), settings);
}

export function loadPersonalizationModel(): PersonalizationModel {
  const saved = readJson(key("model"), DEFAULT_PERSONALIZATION_MODEL);
  return { ...saved, weights: { ...defaultWeights, ...(saved.weights ?? {}) } };
}

export function savePersonalizationModel(model: PersonalizationModel) {
  writeJson(key("model"), model);
}

export function loadAdaptiveSessions(): NeuroAdaptiveSessionSummary[] {
  const value = readJson<NeuroAdaptiveSessionSummary[]>(key("sessions"), []);
  return Array.isArray(value) ? value : [];
}

export function saveAdaptiveSession(session: NeuroAdaptiveSessionSummary) {
  const next = [session, ...loadAdaptiveSessions()].slice(0, 30);
  writeJson(key("sessions"), next);
}
