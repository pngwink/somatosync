import { getActiveDataScope } from "../../lib/session";
import type { AdaptiveResponseEvent, RecoveryMemoryEvent } from "./recoveryMemoryTypes";

const MAX_EVENTS = 80;

function storageKey() {
  return `somatosync.${getActiveDataScope()}.recovery-memory.events.v1`;
}

function isEvent(value: unknown): value is RecoveryMemoryEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return typeof event.id === "string" && (event.kind === "adaptive-response" || event.kind === "context-note" || event.kind === "caregiver-feedback");
}

export function loadRecoveryMemoryEvents(): RecoveryMemoryEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEvent).sort((a, b) => eventTime(b).localeCompare(eventTime(a)));
  } catch {
    return [];
  }
}

function eventTime(event: RecoveryMemoryEvent) {
  return event.kind === "adaptive-response" ? event.completedAt ?? event.startedAt : event.completedAt;
}

function write(events: RecoveryMemoryEvent[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(events.slice(0, MAX_EVENTS)));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("somatosync-recovery-memory-updated"));
  } catch {
    // Keep the feature usable when browser storage is unavailable.
  }
}

export function saveRecoveryMemoryEvent(event: RecoveryMemoryEvent) {
  const withoutDuplicate = loadRecoveryMemoryEvents().filter((item) => item.id !== event.id);
  write([event, ...withoutDuplicate]);
}

export function updateAdaptiveResponseEvent(id: string, patch: Partial<AdaptiveResponseEvent>) {
  const events = loadRecoveryMemoryEvents();
  const next = events.map((event) => event.kind === "adaptive-response" && event.id === id ? { ...event, ...patch } : event);
  write(next);
}
