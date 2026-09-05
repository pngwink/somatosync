import { describe, it, expect, beforeEach } from "vitest";

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

import { buildDataExport, exportFileName } from "./privacyExport";

describe("buildDataExport", () => {
  it("includes only somatosync.-prefixed keys", () => {
    localStorage.setItem("somatosync.assessments.reaction.v1", JSON.stringify([{ id: "a" }]));
    localStorage.setItem("unrelated-app.token", "keep-out");

    const result = buildDataExport(new Date("2026-08-01T12:00:00.000Z"));

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].key).toBe("somatosync.assessments.reaction.v1");
    expect(result.entries.some((e) => e.key === "unrelated-app.token")).toBe(false);
  });

  it("preserves each key's raw stored string value unchanged", () => {
    const raw = JSON.stringify({ id: "a", nested: { value: 1 } });
    localStorage.setItem("somatosync.example.v1", raw);

    const result = buildDataExport(new Date("2026-08-01T12:00:00.000Z"));

    expect(result.entries[0].value).toBe(raw);
  });

  it("includes export metadata: schema version, app name, timestamp, storage type", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const result = buildDataExport(now);

    expect(result.exportSchemaVersion).toBe(1);
    expect(result.application).toBe("SomatoSync");
    expect(result.storageType).toBe("localStorage");
    expect(result.exportedAt).toBe(now.toISOString());
  });

  it("returns an empty entries list when storage is unavailable", () => {
    // @ts-expect-error deliberately deleting window for this test
    delete globalThis.window;
    const result = buildDataExport(new Date("2026-08-01T12:00:00.000Z"));
    expect(result.entries).toEqual([]);
  });
});

describe("exportFileName", () => {
  it("builds a dated filename", () => {
    expect(exportFileName(new Date("2026-08-01T12:00:00.000Z"))).toBe("somatosync-data-2026-08-01.json");
  });
});
