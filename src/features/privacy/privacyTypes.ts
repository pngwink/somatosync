// Types for the Privacy & Data Control Center. Deliberately independent of
// any clinical/assessment types -- this feature only ever looks at
// localStorage keys and raw string values, never at the shape of what's
// inside them.

/** One discovered `somatosync.*` localStorage entry, summarized safely. */
export interface StoredEntrySummary {
  /** The raw localStorage key, e.g. "somatosync.assessments.reaction.v1". */
  key: string;
  /** A conservative, human-readable label derived only from the key text. */
  category: string;
  /** Approximate size of the stored value in bytes (UTF-16 code units). */
  approxBytes: number;
  /** Whether the stored value parses as valid JSON. */
  isValidJson: boolean;
  /**
   * Last-updated time, only populated when the parsed value is a plain
   * object/array containing an explicit, safely-readable timestamp field
   * (e.g. `updatedAt`, `completedAt`, `savedAt`). Never inferred.
   */
  lastUpdatedAt: string | null;
  /**
   * True only when the parsed value explicitly contains `isDemo: true`
   * somewhere safely readable. Never guessed from key names or content.
   */
  isDemoData: boolean;
}

/** Aggregate view of everything currently stored under the somatosync. prefix. */
export interface StorageSummary {
  /** Whether the localStorage API is available and usable in this environment. */
  isStorageAvailable: boolean;
  /** Reason storage is unavailable, if applicable (for messaging only). */
  unavailableReason: StorageUnavailableReason | null;
  entries: StoredEntrySummary[];
  totalApproxBytes: number;
  /** Category label -> number of entries in that category. */
  categoryCounts: Record<string, number>;
}

export type StorageUnavailableReason =
  | "no-window"
  | "blocked-or-private-browsing"
  | "unknown-error";

export interface SomatoSyncDataExport {
  exportSchemaVersion: 1;
  application: "SomatoSync";
  exportedAt: string;
  storageType: "localStorage";
  entries: Array<{
    key: string;
    value: string;
  }>;
}

export interface DeletionResult {
  success: boolean;
  removedCount: number;
  failedKeys: string[];
}
