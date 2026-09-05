import { getActiveDataScope } from "../../lib/session";

export type AgeGroup = "child-teen" | "adult" | "prefer-not-to-say";
export type InjuryCause =
  | "fall"
  | "vehicle"
  | "workplace"
  | "sport"
  | "recreation"
  | "assault"
  | "other"
  | "prefer-not-to-say";
export type RecoveryFocus = "school" | "work" | "daily-life" | "sport";
export type AccessibilityPreference = "standard" | "reduced-stimulation" | "audio-first";

export interface RecoveryRiskContext {
  priorConcussions: boolean;
  headacheHistory: boolean;
  sleepHistory: boolean;
  mentalHealthHistory: boolean;
  learningAttentionNeeds: boolean;
  neckInjury: boolean;
  lossOfConsciousness: boolean;
}

export interface RecoveryProfile {
  injuryDate: string;
  ageGroup: AgeGroup;
  injuryCause: InjuryCause;
  focuses: RecoveryFocus[];
  workingWithClinician: boolean | null;
  accessibilityPreference: AccessibilityPreference;
  setupStatus: "not-started" | "completed" | "skipped";
  riskContext: RecoveryRiskContext;
  updatedAt: string;
  isDemo?: boolean;
}

const emptyRiskContext: RecoveryRiskContext = {
  priorConcussions: false,
  headacheHistory: false,
  sleepHistory: false,
  mentalHealthHistory: false,
  learningAttentionNeeds: false,
  neckInjury: false,
  lossOfConsciousness: false,
};

export const defaultRecoveryProfile: RecoveryProfile = {
  injuryDate: "",
  ageGroup: "prefer-not-to-say",
  injuryCause: "prefer-not-to-say",
  focuses: ["daily-life"],
  workingWithClinician: null,
  accessibilityPreference: "standard",
  setupStatus: "not-started",
  riskContext: emptyRiskContext,
  updatedAt: new Date(0).toISOString(),
};

export const demoRecoveryProfile: RecoveryProfile = {
  injuryDate: "2026-07-14",
  ageGroup: "child-teen",
  injuryCause: "sport",
  focuses: ["school", "sport", "daily-life"],
  workingWithClinician: true,
  accessibilityPreference: "reduced-stimulation",
  setupStatus: "completed",
  riskContext: {
    priorConcussions: false,
    headacheHistory: true,
    sleepHistory: false,
    mentalHealthHistory: false,
    learningAttentionNeeds: false,
    neckInjury: false,
    lossOfConsciousness: false,
  },
  updatedAt: "2026-07-28T07:00:00.000Z",
  isDemo: true,
};

function storageKey() {
  return `somatosync.${getActiveDataScope()}.profile.recovery-context.v1`;
}

function isRecoveryProfile(value: unknown): value is RecoveryProfile {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.injuryDate === "string" &&
    typeof item.ageGroup === "string" &&
    typeof item.injuryCause === "string" &&
    Array.isArray(item.focuses) &&
    typeof item.riskContext === "object" &&
    item.riskContext !== null &&
    typeof item.updatedAt === "string"
  );
}

export function loadRecoveryProfile(): RecoveryProfile {
  if (getActiveDataScope() === "demo") return demoRecoveryProfile;
  if (typeof localStorage === "undefined") return defaultRecoveryProfile;
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return defaultRecoveryProfile;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecoveryProfile(parsed)) return defaultRecoveryProfile;
    const legacy = parsed as Partial<RecoveryProfile>;
    return {
      ...defaultRecoveryProfile,
      ...legacy,
      workingWithClinician: typeof legacy.workingWithClinician === "boolean" ? legacy.workingWithClinician : null,
      accessibilityPreference: ["standard", "reduced-stimulation", "audio-first"].includes(String(legacy.accessibilityPreference))
        ? legacy.accessibilityPreference as AccessibilityPreference
        : "standard",
      setupStatus: ["not-started", "completed", "skipped"].includes(String(legacy.setupStatus))
        ? legacy.setupStatus as RecoveryProfile["setupStatus"]
        : (legacy.injuryDate || legacy.ageGroup !== "prefer-not-to-say" ? "completed" : "not-started"),
      riskContext: { ...emptyRiskContext, ...legacy.riskContext },
      focuses: (legacy.focuses ?? []).filter((focus): focus is RecoveryFocus =>
        ["school", "work", "daily-life", "sport"].includes(String(focus))
      ),
    };
  } catch {
    return defaultRecoveryProfile;
  }
}

export function saveRecoveryProfile(profile: Omit<RecoveryProfile, "updatedAt" | "isDemo">): RecoveryProfile {
  const saved: RecoveryProfile = {
    ...profile,
    focuses: profile.focuses.length > 0 ? profile.focuses : ["daily-life"],
    riskContext: { ...emptyRiskContext, ...profile.riskContext },
    updatedAt: new Date().toISOString(),
  };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(saved));
    } catch {
      // The profile still remains visible in the current page if storage is blocked.
    }
  }
  return saved;
}

export function markRecoverySetupSkipped(): RecoveryProfile {
  const current = loadRecoveryProfile();
  return saveRecoveryProfile({
    injuryDate: current.injuryDate,
    ageGroup: current.ageGroup,
    injuryCause: current.injuryCause,
    focuses: current.focuses,
    workingWithClinician: current.workingWithClinician,
    accessibilityPreference: current.accessibilityPreference,
    setupStatus: "skipped",
    riskContext: current.riskContext,
  });
}

export function daysSinceInjury(profile: RecoveryProfile, now = new Date()): number | null {
  if (!profile.injuryDate) return null;
  const injury = new Date(`${profile.injuryDate}T12:00:00`);
  if (Number.isNaN(injury.getTime())) return null;
  const difference = now.getTime() - injury.getTime();
  return Math.max(0, Math.floor(difference / 86_400_000));
}
