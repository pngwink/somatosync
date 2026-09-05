import type {
  DeletionResult,
  StorageSummary,
  StorageUnavailableReason,
  StoredEntrySummary,
} from "./privacyTypes";

// Safe, generic localStorage utilities for the Privacy & Data Control
// Center. This file intentionally knows nothing about reaction/symptom/
// balance/activity schemas -- it only ever reads key names and raw string
// values, and treats parsed JSON as opaque, untrusted data.

export const SOMATOSYNC_KEY_PREFIX = "somatosync.";

/** Field names that may safely be read as a last-updated timestamp, when present. */
const TIMESTAMP_FIELD_CANDIDATES = ["updatedAt", "lastUpdatedAt", "completedAt", "savedAt", "timestamp"];

/**
 * Returns true if the localStorage API exists and can actually be used
 * (some private-browsing modes expose `localStorage` but throw on use).
 */
export function isStorageAvailable(): boolean {
  return getStorageUnavailableReason() === null;
}

export function getStorageUnavailableReason(): StorageUnavailableReason | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "no-window";
  }
  try {
    const probeKey = "__somatosync_storage_probe__";
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return null;
  } catch {
    return "blocked-or-private-browsing";
  }
}

/** Lists every localStorage key that begins with the SomatoSync prefix. Never throws. */
function listSomatoSyncKeys(): string[] {
  if (!isStorageAvailable()) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SOMATOSYNC_KEY_PREFIX)) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }
  return keys;
}

/**
 * Derives a conservative, human-readable category label from a storage key
 * alone -- e.g. "somatosync.assessments.reaction.v1" -> "Reaction
 * assessments". Falls back to a generic label when the key doesn't match a
 * known pattern, rather than guessing at unfamiliar structure.
 */
export function categoryFromKey(key: string): string {
  const withoutPrefix = key.slice(SOMATOSYNC_KEY_PREFIX.length);
  const rawSegments = withoutPrefix.split(".").filter(Boolean).filter((s) => !/^v\d+$/i.test(s));
  const segments = rawSegments[0] === "demo" || rawSegments[0]?.startsWith("user-") || rawSegments[0] === "signed-out"
    ? rawSegments.slice(1)
    : rawSegments;

  const joined = segments.join(".");

  const knownPatterns: Array<{ test: RegExp; label: string }> = [
    { test: /^assessments\.reaction/i, label: "Reaction assessments" },
    { test: /^assessments\.balance/i, label: "Postural movement assessments" },
    { test: /^assessments\.memory/i, label: "Memory assessments" },
    { test: /^assessments/i, label: "Assessment data" },
    { test: /^symptom/i, label: "Symptom history" },
    { test: /^baseline|^starting-point/i, label: "Starting assessment data" },
    { test: /^check-?in/i, label: "Daily check-ins" },
    { test: /^settings/i, label: "Application settings" },
    { test: /^profile/i, label: "Profile information" },
    { test: /^report/i, label: "Reports" },
    { test: /^return-support|return-to/i, label: "Return support data" },
    { test: /^activity/i, label: "Activity data" },
    { test: /^theme|appearance/i, label: "Appearance settings" },
    { test: /^neuro-adaptive/i, label: "Neuro-Adaptive sessions and settings" },
    { test: /^recovery-memory/i, label: "Recovery response memory" },
  ];

  for (const pattern of knownPatterns) {
    if (pattern.test.test(joined)) return pattern.label;
  }

  if (segments.length === 0) return "Other application data";

  // Conservative fallback: sentence-case the first segment (matching the
  // style of the known labels above) rather than asserting a category we
  // can't confirm from the key alone.
  const first = segments[0].replace(/[-_]/g, " ");
  const sentenceCased = first.charAt(0).toUpperCase() + first.slice(1);
  return `${sentenceCased} data`;
}

/** Approximate byte size of a string, treated as UTF-16 (2 bytes/char) as a safe, cheap estimate. */
function approxByteLength(value: string): number {
  return value.length * 2;
}

/** Safely attempts to parse JSON, returning null (never throwing) on failure. */
function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Reads a last-updated timestamp only when it is explicitly present as a
 * string on a plain object (or the first item of an array of plain
 * objects), under one of a small set of known field names. Never inferred
 * from unrelated data.
 */
function readExplicitTimestamp(parsed: unknown): string | null {
  const candidateObjects: unknown[] = Array.isArray(parsed) ? parsed.slice(0, 1) : [parsed];

  for (const candidate of candidateObjects) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const record = candidate as Record<string, unknown>;
    for (const field of TIMESTAMP_FIELD_CANDIDATES) {
      const value = record[field];
      if (typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value))) {
        return value;
      }
    }
  }
  return null;
}

/**
 * Reports whether the value explicitly marks itself as demo data via an
 * `isDemo: true` field on a plain object, or on any item within an array.
 * Never guessed from key names, size, or content shape.
 */
function readExplicitIsDemo(parsed: unknown): boolean {
  const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  return candidates.some((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    return (candidate as Record<string, unknown>).isDemo === true;
  });
}

/** Builds a safe summary for a single key. Never throws, even on malformed data. */
function summarizeEntry(key: string): StoredEntrySummary | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const parsed = tryParseJson(raw);
  const isValidJson = parsed !== null || raw.trim() === "null";

  return {
    key,
    category: categoryFromKey(key),
    approxBytes: approxByteLength(raw),
    isValidJson,
    lastUpdatedAt: isValidJson ? readExplicitTimestamp(parsed) : null,
    isDemoData: isValidJson ? readExplicitIsDemo(parsed) : false,
  };
}

/**
 * Builds the full storage summary shown on the Privacy & Data page. Safe to
 * call in any environment (SSR, tests, private browsing) -- never throws.
 */
export function getStorageSummary(): StorageSummary {
  const unavailableReason = getStorageUnavailableReason();
  if (unavailableReason) {
    return {
      isStorageAvailable: false,
      unavailableReason,
      entries: [],
      totalApproxBytes: 0,
      categoryCounts: {},
    };
  }

  const entries = listSomatoSyncKeys()
    .map(summarizeEntry)
    .filter((e): e is StoredEntrySummary => e !== null)
    .sort((a, b) => a.key.localeCompare(b.key));

  const totalApproxBytes = entries.reduce((sum, e) => sum + e.approxBytes, 0);
  const categoryCounts: Record<string, number> = {};
  for (const entry of entries) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] ?? 0) + 1;
  }

  return {
    isStorageAvailable: true,
    unavailableReason: null,
    entries,
    totalApproxBytes,
    categoryCounts,
  };
}

/** Formats an approximate byte count as a short human-readable string (e.g. "18 KB"). */
export function formatApproxBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Deletes every localStorage entry whose key begins with the SomatoSync
 * prefix. Deliberately never calls `localStorage.clear()` so unrelated
 * browser/app data is left untouched. Handles individual removal failures
 * gracefully and reports exactly what happened.
 */
export function deleteAllSomatoSyncData(): DeletionResult {
  if (!isStorageAvailable()) {
    return { success: false, removedCount: 0, failedKeys: [] };
  }

  const keys = listSomatoSyncKeys();
  let removedCount = 0;
  const failedKeys: string[] = [];

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
      removedCount++;
    } catch {
      failedKeys.push(key);
    }
  }

  return { success: failedKeys.length === 0, removedCount, failedKeys };
}
