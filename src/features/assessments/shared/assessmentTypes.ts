// Shared metadata for all objective assessment types (reaction time today;
// balance, vision, and voice in the future). Each assessment feature's own
// result type extends this so a future Recovery Readiness Engine can read
// common fields without knowing about assessment-specific ones.
//
// Keep this file small -- only add fields here once at least two assessment
// types actually need them. Premature sharing makes the first assessment
// harder to read for no real benefit yet.

export type AssessmentKind = "reaction-time" | "balance" | "vision" | "voice" | "symptom-check-in";

export interface BaseAssessmentSession {
  id: string;
  assessmentType: AssessmentKind;
  schemaVersion: number;
  startedAt: string; // ISO timestamp
  completedAt: string; // ISO timestamp
  durationMs: number;
  deviceType: string;
}

/** Best-effort, non-invasive device classification for display and QA context only. */
export function detectDeviceType(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android/i.test(ua)) return "mobile";
  return "desktop";
}
