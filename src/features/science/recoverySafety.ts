import type { RecoveryProfile } from "../recovery/recoveryProfile";

export const MILD_EXACERBATION_MAX_POINTS = 2;
export const BRIEF_EXACERBATION_MAX_MINUTES = 60;
export const ACUTE_WINDOW_DAYS = 2;
export const SPORT_STAGE_MIN_HOURS = 24;

export type ActivityReturnWindow = "lt-15" | "15-30" | "30-60" | "gt-60" | "not-yet";

export function activityReturnWindowMinutes(window: ActivityReturnWindow): number | null {
  switch (window) {
    case "lt-15": return 14;
    case "15-30": return 30;
    case "30-60": return 60;
    case "gt-60": return 61;
    case "not-yet": return null;
  }
}

export function interpretActivityTolerance(baseline: number, peak: number, returnWindow: ActivityReturnWindow) {
  const safeBaseline = Math.max(0, Math.min(10, Math.round(baseline)));
  const safePeak = Math.max(0, Math.min(10, Math.round(peak)));
  const increase = Math.max(0, safePeak - safeBaseline);
  const returnMinutes = activityReturnWindowMinutes(returnWindow);
  const brief = returnMinutes != null && returnMinutes <= BRIEF_EXACERBATION_MAX_MINUTES;

  if (increase === 0 && brief) {
    return {
      response: "tolerated" as const,
      label: "No meaningful increase",
      detail: `Before ${safeBaseline}/10 → peak ${safePeak}/10; symptoms returned close to baseline within ${returnWindowLabel(returnWindow)}.`,
    };
  }

  if (increase <= MILD_EXACERBATION_MAX_POINTS && brief) {
    return {
      response: "mild-brief" as const,
      label: "Mild + brief increase",
      detail: `Before ${safeBaseline}/10 → peak ${safePeak}/10 (+${increase}); symptoms returned close to baseline within ${returnWindowLabel(returnWindow)}.`,
    };
  }

  return {
    response: "significant-prolonged" as const,
    label: "More than mild or not brief",
    detail: `Before ${safeBaseline}/10 → peak ${safePeak}/10 (+${increase}); return toward baseline: ${returnWindowLabel(returnWindow)}.`,
  };
}

export function returnWindowLabel(window: ActivityReturnWindow) {
  switch (window) {
    case "lt-15": return "less than 15 minutes";
    case "15-30": return "15–30 minutes";
    case "30-60": return "30–60 minutes";
    case "gt-60": return "more than 60 minutes";
    case "not-yet": return "not yet";
  }
}

export function hoursSince(iso: string, now = new Date()) {
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(0, (now.getTime() - value) / 3_600_000);
}

export function isAcuteRecovery(profile: RecoveryProfile, now = new Date()) {
  if (!profile.injuryDate) return false;
  const injury = new Date(`${profile.injuryDate}T00:00:00`);
  if (Number.isNaN(injury.getTime())) return false;
  const days = (now.getTime() - injury.getTime()) / 86_400_000;
  return days >= 0 && days < ACUTE_WINDOW_DAYS;
}

export const coreMedicalBoundary = {
  title: "Support, not diagnosis or clearance",
  detail: "SomatoSync can organize recovery information and support gradual activity. It does not diagnose concussion, predict a recovery date, or medically clear school, work, driving, exercise, or sport.",
};

export const relativeRestGuidance = {
  title: "Relative rest, then gradual return",
  bullets: [
    "For the first 24–48 hours, keep activity light and manageable rather than using strict complete rest.",
    "Resume low-risk cognitive and physical activity gradually as tolerated.",
    "A small, brief symptom increase can happen during graded activity and does not automatically mean reinjury.",
    "Stop or reduce the activity if symptoms rise more than mildly, stay elevated, or the activity becomes unsafe.",
  ],
};
