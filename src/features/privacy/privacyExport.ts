import type { SomatoSyncDataExport } from "./privacyTypes";
import { SOMATOSYNC_KEY_PREFIX, isStorageAvailable } from "./privacyStorage";

// Builds and downloads a local JSON export of every somatosync.* localStorage
// entry. This never uploads anything -- the file is generated and downloaded
// entirely client-side.

/**
 * Collects every `somatosync.*` key/value pair and wraps it with export
 * metadata. Raw stored strings are preserved as-is (not re-parsed or
 * reshaped) so the export is a faithful copy of what's on disk.
 */
export function buildDataExport(now: Date = new Date()): SomatoSyncDataExport {
  const entries: Array<{ key: string; value: string }> = [];

  if (isStorageAvailable()) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(SOMATOSYNC_KEY_PREFIX)) continue;
        const value = localStorage.getItem(key);
        if (value === null) continue;
        entries.push({ key, value });
      }
    } catch {
      // Leave entries as whatever was successfully collected so far.
    }
  }

  entries.sort((a, b) => a.key.localeCompare(b.key));

  return {
    exportSchemaVersion: 1,
    application: "SomatoSync",
    exportedAt: now.toISOString(),
    storageType: "localStorage",
    entries,
  };
}

export function exportFileName(now: Date = new Date()): string {
  const isoDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `somatosync-data-${isoDate}.json`;
}

/**
 * Triggers a local file download of the export. Pure browser download --
 * no network request is made.
 */
export function downloadDataExport(now: Date = new Date()): void {
  if (typeof document === "undefined") return;

  const exportData = buildDataExport(now);
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(now);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
