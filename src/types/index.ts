// Core domain types for SomatoSync.
// These model the shape of data the UI expects. Mock data in `src/data`
// conforms to these interfaces today; a future API layer should return
// data matching these same shapes so no UI code needs to change.

export type TrendDirection = "improving" | "stable" | "declining";
export type ConfidenceLevel = "low" | "moderate" | "high";
export type Units = "imperial" | "metric";
export type ThemeMode = "light" | "dark" | "system";
export type ResultTone = "neutral" | "info" | "positive" | "caution" | "risk";

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string; // ISO date
  age: number;
  activity: string; // sport / activity
  injuryDate: string; // ISO date
  recoveryDay: number;
  provider: {
    name: string;
    role: string;
  };
  school?: string;
  hasBaseline: boolean;
  avatarInitials: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export type SymptomKey =
  | "headache"
  | "dizziness"
  | "fatigue"
  | "lightSensitivity"
  | "noiseSensitivity"
  | "concentration"
  | "sleepQuality"
  | "screenExposureHours"
  | "activityLoad"
  | "stress";

export interface DailyCheckIn {
  id: string;
  date: string; // ISO date
  completed: boolean;
  symptoms: Partial<Record<SymptomKey, number>>; // 0-10 severity, sleepQuality 0-10 quality
  screenExposureHours?: number;
  activityNotes?: string;
  freeTextNotes?: string;
}

export type AssessmentType =
  | "reaction-time"
  | "balance"
  | "memory"
  | "symptom-check-in";

export interface AssessmentDefinition {
  id: AssessmentType;
  name: string;
  purpose: string;
  estimatedDurationMinutes: number;
  requiresDevice?: "camera" | "motion" | null;
  suggestedCadence?: string;
  cadenceNote?: string;
}

export interface AssessmentResult {
  id: string;
  type: AssessmentType;
  date: string;
  value: number; // interpretation depends on type
  unit: string;
  startingValue?: number | null;
  percentFromStart?: number | null; // signed, positive = improved from the first assessment
  status: "completed" | "not-completed" | "unavailable";
  interpretationLabel?: string;
  interpretationDetail?: string;
  interpretationTone?: ResultTone;
}

export type ReturnPathwayType = "learn" | "play";

export interface ReturnStage {
  pathway: ReturnPathwayType;
  stageNumber: number;
  stageLabel: string;
  description: string;
  requirementsToConsider: string[];
}

export interface DecisionSupportResult {
  pathway: ReturnPathwayType;
  statusLabel: string; // e.g. "Continue Stage 3"
  currentStage: ReturnStage;
  evidenceSupporting: string[];
  evidenceCaution: string[];
  relatedAssessmentIds: string[];
  suggestedQuestions: string[];
  generatedAt: string;
  confidence: ConfidenceLevel;
}

export interface ResearchSource {
  id: string;
  title: string;
  type: "consensus-statement" | "public-health-guidance" | "peer-reviewed" | "clinical-protocol" | "research-standard";
  publisher: string;
  year: number;
  url: string;
  evidenceNote: string;
}

export interface ResearchTraceStep {
  node: string;
  status: "passed" | "fallback" | "blocked" | "skipped";
  durationMs: number;
  detail: string;
}

export interface ResearchVerification {
  passed: boolean;
  groundedClaims: number;
  totalClaims: number;
  citationCoverage: number;
  blockedReason?: string;
}

export interface ResearchRetrievalDetails {
  mode: "bm25" | "hybrid" | "hybrid-reranked";
  candidateCount: number;
  selectedTopicIds: string[];
  lexicalMs: number;
  denseMs: number;
  rerankMs: number;
  totalMs: number;
}

export interface ResearchAnswer {
  id: string;
  question: string;
  answer: string;
  patientContext?: string;
  sources: ResearchSource[];
  generatedAt: string;
  retrievalLabel?: string;
  confidenceLabel?: "strong match" | "related evidence" | "limited match";
  generationMode?: "on-device-ai" | "local-retrieval";
  orchestrationTrace?: ResearchTraceStep[];
  verification?: ResearchVerification;
  retrievalDetails?: ResearchRetrievalDetails;
}

export interface ClinicianReport {
  id: string;
  dateRangeLabel: string;
  audience: "clinician" | "parent" | "school" | "athletic-trainer";
  generatedAt: string;
  includedMetrics: string[];
}

export interface TodayTask {
  id: string;
  label: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  href: string;
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: T };
