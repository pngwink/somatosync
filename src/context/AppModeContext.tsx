import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getStoredSessionMode,
  getStoredUserId,
  getStoredUserName,
  SESSION_MODE_KEY,
  SESSION_NAME_KEY,
  SESSION_USER_ID_KEY,
  type AppSessionMode,
} from "../lib/session";
import { loadReactionDemoHistory } from "../features/assessments/reaction/reactionDemoData";

interface AppModeValue {
  mode: AppSessionMode;
  userName: string;
  userId: string;
  enterDemo: () => void;
  enterUser: (name?: string, userId?: string) => void;
  signOut: () => void;
}

const AppModeContext = createContext<AppModeValue | null>(null);

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The prototype still works in-memory when browser storage is unavailable.
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures during sign-out.
  }
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppSessionMode>(() => {
    const storedMode = getStoredSessionMode();
    if (storedMode === "demo") loadReactionDemoHistory();
    return storedMode;
  });
  const [userName, setUserName] = useState(getStoredUserName);
  const [userId, setUserId] = useState(getStoredUserId);

  const value = useMemo<AppModeValue>(
    () => ({
      mode,
      userName,
      userId,
      enterDemo: () => {
        safeSet(SESSION_MODE_KEY, "demo");
        loadReactionDemoHistory();
        setMode("demo");
      },
      enterUser: (name, id) => {
        const cleanName = name?.trim() || "New User";
        const cleanId = id?.trim() || "prototype-user";
        safeSet(SESSION_MODE_KEY, "user");
        safeSet(SESSION_NAME_KEY, cleanName);
        safeSet(SESSION_USER_ID_KEY, cleanId);
        setUserName(cleanName);
        setUserId(cleanId);
        setMode("user");
      },
      signOut: () => {
        safeRemove(SESSION_MODE_KEY);
        safeRemove(SESSION_NAME_KEY);
        safeRemove(SESSION_USER_ID_KEY);
        setMode("signed-out");
        setUserName("New User");
        setUserId("prototype-user");
      },
    }),
    [mode, userId, userName]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const value = useContext(AppModeContext);
  if (!value) throw new Error("useAppMode must be used inside AppModeProvider");
  return value;
}
