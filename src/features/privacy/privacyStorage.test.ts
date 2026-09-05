import { describe, it, expect, beforeEach } from "vitest";

// Minimal in-memory localStorage stub, matching the convention used in
// reactionStorage.test.ts -- no jsdom dependency needed for these tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
});

import {
  getStorageSummary,
  deleteAllSomatoSyncData,
  categoryFromKey,
  formatApproxBytes,
  isStorageAvailable,
  getStorageUnavailableReason,
} from "./privacyStorage";

describe("getStorageSummary", () => {
  it("reports an empty summary when there are no SomatoSync entries", () => {
    const summary = getStorageSummary();
    expect(summary.isStorageAvailable).toBe(true);
    expect(summary.entries).toEqual([]);
    expect(summary.totalApproxBytes).toBe(0);
    expect(summary.categoryCounts).toEqual({});
  });

  it("discovers multiple SomatoSync entries", () => {
    localStorage.setItem("somatosync.assessments.reaction.v1", JSON.stringify([{ id: "a" }]));
    localStorage.setItem("somatosync.symptom.history.v1", JSON.stringify([{ id: "b" }, { id: "c" }]));
    localStorage.setItem("somatosync.settings.v1", JSON.stringify({ theme: "light" }));

    const summary = getStorageSummary();
    expect(summary.entries).toHaveLength(3);
    expect(summary.entries.map((e) => e.key)).toEqual([
      "somatosync.assessments.reaction.v1",
      "somatosync.settings.v1",
      "somatosync.symptom.history.v1",
    ]);
  });

  it("excludes localStorage keys that do not belong to SomatoSync", () => {
    localStorage.setItem("somatosync.settings.v1", JSON.stringify({ theme: "light" }));
    localStorage.setItem("some-other-app.token", "abc123");
    localStorage.setItem("unrelated-key", "1");

    const summary = getStorageSummary();
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].key).toBe("somatosync.settings.v1");
  });

  it("handles malformed JSON without crashing, and reports it as unreadable", () => {
    localStorage.setItem("somatosync.broken.v1", "{not valid json");

    const summary = getStorageSummary();
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].isValidJson).toBe(false);
    expect(summary.entries[0].lastUpdatedAt).toBeNull();
    expect(summary.entries[0].isDemoData).toBe(false);
  });

  it("computes an approximate byte size for each entry", () => {
    const value = JSON.stringify({ a: 1 });
    localStorage.setItem("somatosync.small.v1", value);

    const summary = getStorageSummary();
    expect(summary.entries[0].approxBytes).toBe(value.length * 2);
    expect(summary.totalApproxBytes).toBe(value.length * 2);
  });

  it("only reports lastUpdatedAt when an explicit, safely-readable timestamp field is present", () => {
    localStorage.setItem("somatosync.with-timestamp.v1", JSON.stringify({ updatedAt: "2026-07-20T09:00:00.000Z" }));
    localStorage.setItem("somatosync.without-timestamp.v1", JSON.stringify({ foo: "bar" }));

    const summary = getStorageSummary();
    const withTs = summary.entries.find((e) => e.key === "somatosync.with-timestamp.v1")!;
    const withoutTs = summary.entries.find((e) => e.key === "somatosync.without-timestamp.v1")!;
    expect(withTs.lastUpdatedAt).toBe("2026-07-20T09:00:00.000Z");
    expect(withoutTs.lastUpdatedAt).toBeNull();
  });

  it("only marks an entry as demo data when isDemo: true is explicitly present", () => {
    localStorage.setItem("somatosync.demo.v1", JSON.stringify([{ id: "x", isDemo: true }]));
    localStorage.setItem("somatosync.real.v1", JSON.stringify([{ id: "y" }]));

    const summary = getStorageSummary();
    expect(summary.entries.find((e) => e.key === "somatosync.demo.v1")!.isDemoData).toBe(true);
    expect(summary.entries.find((e) => e.key === "somatosync.real.v1")!.isDemoData).toBe(false);
  });

  it("reports storage unavailable when window does not exist", () => {
    // Simulate a server/test environment without `window`.
    // @ts-expect-error deliberately deleting window for this test
    delete globalThis.window;
    expect(isStorageAvailable()).toBe(false);
    expect(getStorageUnavailableReason()).toBe("no-window");
    const summary = getStorageSummary();
    expect(summary.isStorageAvailable).toBe(false);
    expect(summary.entries).toEqual([]);
  });
});

describe("categoryFromKey", () => {
  it("derives a conservative category label from known key patterns", () => {
    expect(categoryFromKey("somatosync.assessments.reaction.v1")).toBe("Reaction assessments");
    expect(categoryFromKey("somatosync.symptom.history.v1")).toBe("Symptom history");
    expect(categoryFromKey("somatosync.settings.v1")).toBe("Application settings");
  });

  it("falls back to a generic label for unfamiliar key shapes without guessing", () => {
    expect(categoryFromKey("somatosync.mystery-thing.v1")).toBe("Mystery thing data");
    expect(categoryFromKey("somatosync.")).toBe("Other application data");
  });
});

describe("formatApproxBytes", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatApproxBytes(500)).toBe("500 B");
    expect(formatApproxBytes(18000)).toBe("18 KB");
    expect(formatApproxBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("deleteAllSomatoSyncData", () => {
  it("removes only somatosync.-prefixed keys", () => {
    localStorage.setItem("somatosync.a.v1", "1");
    localStorage.setItem("somatosync.b.v1", "2");
    localStorage.setItem("unrelated-app.token", "keep-me");

    const result = deleteAllSomatoSyncData();

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(localStorage.getItem("somatosync.a.v1")).toBeNull();
    expect(localStorage.getItem("somatosync.b.v1")).toBeNull();
  });

  it("leaves unrelated keys untouched after deletion", () => {
    localStorage.setItem("somatosync.a.v1", "1");
    localStorage.setItem("unrelated-app.token", "keep-me");

    deleteAllSomatoSyncData();

    expect(localStorage.getItem("unrelated-app.token")).toBe("keep-me");
  });

  it("reports an accurate removed count", () => {
    localStorage.setItem("somatosync.a.v1", "1");
    localStorage.setItem("somatosync.b.v1", "2");
    localStorage.setItem("somatosync.c.v1", "3");

    const result = deleteAllSomatoSyncData();
    expect(result.removedCount).toBe(3);
  });

  it("does nothing and reports failure when storage is unavailable", () => {
    // @ts-expect-error deliberately deleting window for this test
    delete globalThis.window;
    const result = deleteAllSomatoSyncData();
    expect(result.success).toBe(false);
    expect(result.removedCount).toBe(0);
  });
});
