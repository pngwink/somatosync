export type AppSessionMode = "signed-out" | "demo" | "user";

export const SESSION_MODE_KEY = "somatosync.session.mode.v1";
export const SESSION_NAME_KEY = "somatosync.session.name.v1";
export const SESSION_USER_ID_KEY = "somatosync.session.userId.v1";

function safeStorageGet(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getStoredSessionMode(): AppSessionMode {
  const value = safeStorageGet(SESSION_MODE_KEY);
  return value === "demo" || value === "user" ? value : "signed-out";
}

export function getStoredUserName(): string {
  return safeStorageGet(SESSION_NAME_KEY)?.trim() || "New User";
}

export function getStoredUserId(): string {
  return safeStorageGet(SESSION_USER_ID_KEY)?.trim() || "prototype-user";
}

function normalizeScopePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prototype-user";
}

/**
 * Returns the namespace used by locally persisted assessment data.
 * Demo and real-user records always receive different keys.
 */
export function getActiveDataScope(): string {
  const mode = getStoredSessionMode();
  if (mode === "demo") return "demo";
  if (mode === "user") return `user-${normalizeScopePart(getStoredUserId())}`;
  return "signed-out";
}
