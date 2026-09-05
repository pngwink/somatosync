import { getActiveDataScope } from "../../lib/session";
import type { RelaySharePayload, StoredRelayShare } from "./relayTypes";

function key() {
  return `somatosync.${getActiveDataScope()}.relay.shares.v1`;
}

export function loadRelayShares(): StoredRelayShare[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key()) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredRelayShare => Boolean(item && typeof item === "object" && typeof (item as StoredRelayShare).shareId === "string"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
  } catch {
    return [];
  }
}

function write(shares: StoredRelayShare[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(key(), JSON.stringify(shares.slice(0, 12))); } catch { /* local-only feature remains usable without persistence */ }
}

export function saveRelayShare(payload: RelaySharePayload) {
  const next: StoredRelayShare = {
    shareId: payload.shareId,
    audience: payload.audience,
    createdAt: payload.createdAt,
    expiresAt: payload.expiresAt,
    supports: payload.supports,
  };
  write([next, ...loadRelayShares().filter((share) => share.shareId !== next.shareId)]);
}

export function endRelayShare(shareId: string) {
  write(loadRelayShares().map((share) => share.shareId === shareId ? { ...share, endedAt: new Date().toISOString() } : share));
}

export function hasRelayShare(shareId: string) {
  return loadRelayShares().some((share) => share.shareId === shareId);
}
