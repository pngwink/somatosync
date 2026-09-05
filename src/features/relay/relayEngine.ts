import { loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { buildSupportPatterns } from "../recovery-memory/recoveryMemoryEngine";
import type { RelayAudience, RelayFeedbackPayload, RelaySharePayload, RelaySupport } from "./relayTypes";

const patternSupportMap: Record<string, Omit<RelaySupport, "id" | "source">> = {
  "Readability adjustments": {
    title: "Larger, easier-to-read material",
    detail: "Use larger text, comfortable spacing, or a printed/zoomed version for sustained reading.",
    patternTitle: "Readability adjustments",
  },
  "Softer visuals": {
    title: "Reduce glare and visual intensity",
    detail: "Use a comfortable brightness level and avoid visually harsh or high-glare presentation when possible.",
    patternTitle: "Softer visuals",
  },
  "Reduced motion": {
    title: "Limit moving visual content",
    detail: "Avoid unnecessary animation, autoplay, or visually busy motion during focused work.",
    patternTitle: "Reduced motion",
  },
  "Lower reading load": {
    title: "Break reading into shorter sections",
    detail: "Chunk longer material and allow brief pauses instead of requiring one long reading block.",
    patternTitle: "Lower reading load",
  },
  "Planned breaks": {
    title: "Plan short recovery breaks",
    detail: "Use brief, predictable breaks before fatigue builds during demanding work.",
    patternTitle: "Planned breaks",
  },
  "Quieter environment": {
    title: "Use a quieter work space",
    detail: "Reduce unnecessary background noise during focused work or testing when a quieter setting is available.",
    patternTitle: "Quieter environment",
  },
};

function makeSupport(key: string, value: Omit<RelaySupport, "id" | "source">, source: RelaySupport["source"]): RelaySupport {
  return { id: key, ...value, source };
}

export function buildSuggestedRelaySupports(): RelaySupport[] {
  const supports: RelaySupport[] = [];
  const seen = new Set<string>();

  for (const pattern of buildSupportPatterns()) {
    const mapped = patternSupportMap[pattern.title];
    if (!mapped || seen.has(mapped.title)) continue;
    supports.push(makeSupport(`pattern-${pattern.id}`, mapped, "response-memory"));
    seen.add(mapped.title);
  }

  const latest = loadPcssHistory()[0];
  if (latest) {
    const r = latest.ratings;
    const add = (support: RelaySupport) => {
      if (seen.has(support.title)) return;
      supports.push(support);
      seen.add(support.title);
    };

    if (Math.max(r.sensitivityToLight, r.visualProblems, r.headache) >= 2) {
      add(makeSupport("symptom-visual", {
        title: "Reduce visual load",
        detail: "Allow lower glare, comfortable screen brightness, larger text, or printed/audio material when useful.",
        patternTitle: "Softer visuals",
      }, "symptom-pattern"));
    }
    if (Math.max(r.difficultyConcentrating, r.memoryProblems, r.mentallyFoggy, r.slowedDown) >= 2) {
      add(makeSupport("symptom-cognitive", {
        title: "Chunk demanding work",
        detail: "Break longer assignments into smaller steps and allow extra processing time between sections.",
        patternTitle: "Lower reading load",
      }, "symptom-pattern"));
    }
    if (Math.max(r.fatigue, r.drowsiness, r.slowedDown) >= 2) {
      add(makeSupport("symptom-breaks", {
        title: "Plan short recovery breaks",
        detail: "Use brief, predictable breaks before fatigue builds instead of waiting until the task becomes difficult to tolerate.",
        patternTitle: "Planned breaks",
      }, "symptom-pattern"));
    }
    if (Math.max(r.sensitivityToNoise, r.headache) >= 2) {
      add(makeSupport("symptom-noise", {
        title: "Use a quieter work space",
        detail: "For focused work or testing, reduce unnecessary background noise when a quieter setting is available.",
        patternTitle: "Quieter environment",
      }, "symptom-pattern"));
    }
  }

  return supports.slice(0, 6);
}

export function createRelaySharePayload(args: {
  audience: RelayAudience;
  supports: RelaySupport[];
  durationHours: number;
}): RelaySharePayload {
  const now = new Date();
  return {
    version: 1,
    kind: "somatosync-support-share",
    shareId: `relay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    audience: args.audience,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + args.durationHours * 60 * 60 * 1000).toISOString(),
    supports: args.supports.slice(0, 4),
  };
}

function toBase64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url<T>(encoded: string): T | null {
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export interface RelayShareUrlInfo {
  url: string;
  origin: string;
  crossDeviceReady: boolean;
  usingConfiguredPublicUrl: boolean;
}

function configuredRelayOrigin(): string | null {
  const raw = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isLocalOnlyOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  } catch {
    return true;
  }
}

export function buildRelayShareUrlInfo(payload: RelaySharePayload): RelayShareUrlInfo {
  const configured = configuredRelayOrigin();
  const currentOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const origin = configured || currentOrigin;
  return {
    url: `${origin}/share/supports#r=${toBase64Url(payload)}`,
    origin,
    crossDeviceReady: Boolean(origin) && !isLocalOnlyOrigin(origin),
    usingConfiguredPublicUrl: Boolean(configured),
  };
}

export function buildRelayShareUrl(payload: RelaySharePayload): string {
  return buildRelayShareUrlInfo(payload).url;
}

export function parseRelayShareHash(hash: string): RelaySharePayload | null {
  const match = hash.match(/(?:^#|[&#])r=([^&]+)/);
  if (!match) return null;
  const payload = fromBase64Url<RelaySharePayload>(match[1]);
  if (!payload || payload.version !== 1 || payload.kind !== "somatosync-support-share" || !Array.isArray(payload.supports)) return null;
  if (!["teacher", "parent", "coach"].includes(payload.audience)) return null;
  return payload;
}

export function isRelayShareExpired(payload: RelaySharePayload): boolean {
  return Date.now() > new Date(payload.expiresAt).getTime();
}

export function buildRelayFeedbackCode(payload: RelayFeedbackPayload): string {
  return `SOMATOSYNC-FEEDBACK.${toBase64Url(payload)}`;
}

export function parseRelayFeedbackCode(value: string): RelayFeedbackPayload | null {
  const trimmed = value.trim();
  const encoded = trimmed.startsWith("SOMATOSYNC-FEEDBACK.") ? trimmed.slice("SOMATOSYNC-FEEDBACK.".length) : trimmed;
  const payload = fromBase64Url<RelayFeedbackPayload>(encoded);
  if (!payload || payload.version !== 1 || payload.kind !== "somatosync-support-feedback" || !Array.isArray(payload.responses)) return null;
  return payload;
}

export function audienceLabel(audience: RelayAudience): string {
  return audience === "teacher" ? "Teacher / school" : audience === "coach" ? "Coach / trainer" : "Parent / caregiver";
}
