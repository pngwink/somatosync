export type AdaptiveProfile = "standard" | "reduced-stimulation" | "audio-first";
export type FocusMonitorStatus = "off" | "starting" | "calibrating" | "active" | "paused" | "break" | "error";

export interface NeuroAdaptiveSettings {
  enabled: boolean;
  profile: AdaptiveProfile;
  textScale: number;
  lineSpacing: number;
  reduceMotion: boolean;
  softContrast: boolean;
  textToSpeechPreferred: boolean;
  reduceDensity: boolean;
  focusReadingLayout: boolean;
  autoAdapt: boolean;
  updatedAt: string;
}

export interface AdaptiveCheckIn {
  lightSensitivity: number;
  visualMotionDiscomfort: number;
  mentalFatigue: number;
}


export interface AdaptiveInterventionPlan {
  profile: AdaptiveProfile;
  textScale: number;
  lineSpacing: number;
  reduceMotion: boolean;
  softContrast: boolean;
  textToSpeechPreferred: boolean;
  reduceDensity: boolean;
  focusReadingLayout: boolean;
  changes: string[];
  reasons: string[];
  recommendBreak: boolean;
}

export interface FaceSignalSample {
  timeMs: number;
  blinkScore: number;
  browTension: number;
  faceScale: number;
  headX: number;
  headY: number;
  gazeDeviation: number;
}

export interface SignalWindow {
  blinkRateBpm: number;
  browTension: number;
  faceScale: number;
  headMotion: number;
  gazeDeviation: number;
  scrollReversalsPerMinute: number;
  idleRatio: number;
}

export type StrainFeatureKey = keyof SignalWindow;
export type StrainFeatureVector = [number, number, number, number, number, number, number];

export interface StrainReason {
  key: StrainFeatureKey;
  label: string;
  detail: string;
  contribution: number;
}

export interface StrainEstimate {
  score: number;
  band: "low" | "possible" | "elevated";
  reasons: StrainReason[];
  enoughSignals: boolean;
  featureVector?: StrainFeatureVector;
  mlProbability?: number | null;
}

export interface PersonalizationModel {
  thresholdOffset: number;
  weights: Record<StrainFeatureKey, number>;
  confirmations: number;
  rejections: number;
  updatedAt: string;
}

export interface NeuroAdaptiveSessionSummary {
  id: string;
  completedAt: string;
  durationSeconds: number;
  cameraUsed: boolean;
  trackingQualityPercent: number;
  maxStrainScore: number;
  promptCount: number;
  adaptationsApplied: string[];
  userConfirmedPrompt: boolean | null;
  checkIn: AdaptiveCheckIn;
  featureVector?: StrainFeatureVector;
  mlProbability?: number | null;
  source?: "guided-session" | "site-wide";
  isDemo?: boolean;
}

export interface FocusMonitorSnapshot {
  status: FocusMonitorStatus;
  calibrationProgress: number;
  trackingQualityPercent: number;
  estimate: StrainEstimate | null;
  promptVisible: boolean;
  breakSeconds: number;
  error: string;
  labeledExampleCount: number;
  tensorflowReady: boolean;
}
