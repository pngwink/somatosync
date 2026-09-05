import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppMode } from "./AppModeContext";
import { getActiveDataScope } from "../lib/session";

export interface UserPreferences {
  notificationsEnabled: boolean;
  assessmentRemindersEnabled: boolean;
  reducedVisualIntensity: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  assessmentRemindersEnabled: true,
  reducedVisualIntensity: false,
};

interface UserPreferencesValue extends UserPreferences {
  setNotificationsEnabled: (enabled: boolean) => void;
  setAssessmentRemindersEnabled: (enabled: boolean) => void;
  setReducedVisualIntensity: (enabled: boolean) => void;
}

const Context = createContext<UserPreferencesValue | null>(null);

function storageKey() {
  return `somatosync.${getActiveDataScope()}.settings.preferences.v1`;
}

function readPreferences(): UserPreferences {
  if (typeof localStorage === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      notificationsEnabled: parsed.notificationsEnabled !== false,
      assessmentRemindersEnabled: parsed.assessmentRemindersEnabled !== false,
      reducedVisualIntensity: parsed.reducedVisualIntensity === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function applyVisualIntensity(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("low-intensity", enabled);
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { mode, userId } = useAppMode();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const next = mode === "signed-out" ? DEFAULT_PREFERENCES : readPreferences();
    setPreferences(next);
    applyVisualIntensity(next.reducedVisualIntensity);
  }, [mode, userId]);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      applyVisualIntensity(next.reducedVisualIntensity);
      if (mode !== "signed-out" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(storageKey(), JSON.stringify({ ...next, updatedAt: new Date().toISOString() }));
        } catch {
          // Keep the preference active for this session when storage is unavailable.
        }
      }
      return next;
    });
  }, [mode]);

  const value = useMemo<UserPreferencesValue>(() => ({
    ...preferences,
    setNotificationsEnabled: (notificationsEnabled) => update({ notificationsEnabled }),
    setAssessmentRemindersEnabled: (assessmentRemindersEnabled) => update({ assessmentRemindersEnabled }),
    setReducedVisualIntensity: (reducedVisualIntensity) => update({ reducedVisualIntensity }),
  }), [preferences, update]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useUserPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("useUserPreferences must be used inside UserPreferencesProvider");
  return value;
}
