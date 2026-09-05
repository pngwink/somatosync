export type RelayAudience = "teacher" | "parent" | "coach";

export interface RelaySupport {
  id: string;
  title: string;
  detail: string;
  patternTitle: string;
  source: "response-memory" | "symptom-pattern" | "manual";
}

export interface RelaySharePayload {
  version: 1;
  kind: "somatosync-support-share";
  shareId: string;
  audience: RelayAudience;
  createdAt: string;
  expiresAt: string;
  supports: RelaySupport[];
}

export type RelaySupportResponse = "helped" | "no-clear-change" | "worse" | "not-sure";

export interface RelayFeedbackResponse {
  supportId: string;
  title: string;
  patternTitle: string;
  provided: boolean;
  response: RelaySupportResponse | null;
}

export interface RelayFeedbackPayload {
  version: 1;
  kind: "somatosync-support-feedback";
  shareId: string;
  audience: RelayAudience;
  createdAt: string;
  responses: RelayFeedbackResponse[];
}

export interface StoredRelayShare {
  shareId: string;
  audience: RelayAudience;
  createdAt: string;
  expiresAt: string;
  supports: RelaySupport[];
  endedAt?: string;
}
