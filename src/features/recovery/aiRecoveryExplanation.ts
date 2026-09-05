import { recoveryGuidanceSources, type SymptomGuidanceItem } from "../guidance/guidanceEngine";
import type { RecoveryOutlook } from "../outlook/recoveryOutlook";
import type { RecoveryEvidenceSummary } from "./evidenceSummary";
import { generateOnDeviceText, type GenerationProgress } from "../ai/onDeviceTextGeneration";

export type AiRecoveryProvider = "chrome-gemini-nano" | "transformers-js" | "local-fallback";

export interface AiRecoveryExplanation {
  headline: string;
  overview: string;
  changes: string[];
  focusAreas: string[];
  uncertainty: string;
  safetyNote: string;
  provider: AiRecoveryProvider;
  model?: string;
  generatedAt: string;
}

export interface AiRecoveryRequestPayload {
  evidence: {
    overallLabel: string;
    overallDetail: string;
    measuredCount: number;
    improvingCount: number;
    worseningCount: number;
    domains: Array<{
      label: string;
      direction: string;
      headline: string;
      detail: string;
      sampleCount: number;
    }>;
    changeAlerts: Array<{ title: string; detail: string }>;
  };
  outlook: {
    phaseLabel: string;
    summary: string;
    dataCoverage: string;
    signals: Array<{ title: string; detail: string }>;
  };
  guidance: Array<{
    title: string;
    trigger: string;
    suggestions: string[];
  }>;
  scientificBasis: Array<{
    id: string;
    title: string;
    publisher: string;
    note: string;
    url: string;
  }>;
}

export type AiGenerationProgress = GenerationProgress;

export function buildAiRecoveryPayload(
  evidence: RecoveryEvidenceSummary,
  outlook: RecoveryOutlook,
  guidance: SymptomGuidanceItem[]
): AiRecoveryRequestPayload {
  const sourceIds = new Set([
    ...guidance.flatMap((item) => item.sourceIds),
    ...outlook.signals.flatMap((signal) => signal.sourceIds),
    "amsterdam-2022",
  ]);
  return {
    evidence: {
      overallLabel: evidence.overallLabel,
      overallDetail: evidence.overallDetail,
      measuredCount: evidence.measuredCount,
      improvingCount: evidence.improvingCount,
      worseningCount: evidence.worseningCount,
      domains: evidence.domains.map((domain) => ({
        label: domain.label,
        direction: domain.direction,
        headline: domain.headline,
        detail: domain.detail,
        sampleCount: domain.sampleCount,
      })),
      changeAlerts: (evidence.changeAlerts ?? []).map((alert) => ({ title: alert.title, detail: alert.detail })),
    },
    outlook: {
      phaseLabel: outlook.phaseLabel,
      summary: outlook.summary,
      dataCoverage: outlook.dataCoverage,
      signals: outlook.signals.map((signal) => ({ title: signal.title, detail: signal.detail })),
    },
    guidance: guidance.slice(0, 4).map((item) => ({
      title: item.title,
      trigger: item.trigger,
      suggestions: item.suggestions.slice(0, 3),
    })),
    scientificBasis: recoveryGuidanceSources
      .filter((source) => sourceIds.has(source.id))
      .map((source) => ({
        id: source.id,
        title: source.title,
        publisher: source.publisher,
        note: source.note,
        url: source.url,
      })),
  };
}

function compactPrompt(payload: AiRecoveryRequestPayload): string {
  const domainLines = payload.evidence.domains
    .filter((domain) => domain.direction !== "unavailable")
    .slice(0, 6)
    .map((domain) => `${domain.label}: ${domain.direction}; ${domain.headline}; ${domain.detail}`)
    .join("\n");
  const guidanceLines = payload.guidance
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.suggestions[0] ?? item.trigger}`)
    .join("\n");
  const alertLines = payload.evidence.changeAlerts
    .slice(0, 2)
    .map((alert) => `${alert.title}: ${alert.detail}`)
    .join("\n");

  return [
    "Write a calm, clear recovery explanation in 3 short sentences using only the supplied facts.",
    "Do not diagnose, predict a recovery date, calculate readiness, give clearance, or add medical advice.",
    "Describe within-person changes, mention uncertainty, and use inclusive language for sport and non-sport concussion.",
    `Overall: ${payload.evidence.overallLabel}. ${payload.evidence.overallDetail}`,
    `Outlook: ${payload.outlook.summary}`,
    `Data coverage: ${payload.outlook.dataCoverage}`,
    domainLines ? `Domains:\n${domainLines}` : "Domains: not enough measurements yet.",
    alertLines ? `Unexpected-change checks:\n${alertLines}` : "Unexpected-change checks: none detected or not enough repeated data.",
    guidanceLines ? `Approved support options:\n${guidanceLines}` : "Approved support options: continue the individualized plan from a healthcare professional.",
  ].join("\n").slice(0, 3200);
}

export async function requestAiRecoveryExplanation(
  payload: AiRecoveryRequestPayload,
  signal?: AbortSignal,
  onProgress?: (progress: AiGenerationProgress) => void
): Promise<AiRecoveryExplanation> {
  if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
  const prompt = compactPrompt(payload);
  const generated = await generateOnDeviceText(prompt, {
    signal,
    onProgress,
    maxLength: 1100,
    maxNewTokens: 150,
  });

  if (!generated) {
    throw new Error("No supported on-device language model could start. The evidence-based local summary is still available.");
  }

  const deterministic = buildLocalRecoveryExplanation(payload);
  return {
    ...deterministic,
    overview: generated.text,
    provider: generated.provider,
    model: generated.model,
    uncertainty: `${deterministic.uncertainty} The wording above was generated locally on this device from the same precomputed evidence.`,
    generatedAt: new Date().toISOString(),
  };
}

export function buildLocalRecoveryExplanation(
  payload: AiRecoveryRequestPayload,
  reason?: string
): AiRecoveryExplanation {
  const measured = payload.evidence.domains.filter((domain) => domain.direction !== "unavailable");
  const improving = measured.filter((domain) => domain.direction === "improving");
  const worsening = measured.filter((domain) => domain.direction === "worsening");
  const similar = measured.filter((domain) => domain.direction === "similar" || domain.direction === "starting");

  const changes = [
    ...improving.map((domain) => `${domain.label}: ${domain.headline}. ${domain.detail}`),
    ...worsening.map((domain) => `${domain.label}: ${domain.headline}. ${domain.detail}`),
    ...similar.slice(0, 2).map((domain) => `${domain.label}: ${domain.headline}. ${domain.detail}`),
  ].slice(0, 4);

  const focusAreas = payload.guidance.length > 0
    ? payload.guidance.slice(0, 3).map((item) => `${item.title}: ${item.suggestions[0]}`)
    : payload.outlook.signals.slice(0, 3).map((signal) => `${signal.title}: ${signal.detail}`);

  return {
    headline: payload.evidence.overallLabel,
    overview: `${payload.evidence.overallDetail} ${payload.outlook.summary}`,
    changes: changes.length ? changes : ["Complete more assessments to create a multidomain trend explanation."],
    focusAreas: focusAreas.length ? focusAreas : ["Continue following the individualized plan from a healthcare professional."],
    uncertainty: `This evidence-based local summary uses ${payload.outlook.dataCoverage} It does not infer an exact recovery date or medical readiness.${reason ? ` On-device generation was unavailable: ${reason}` : ""}`,
    safetyNote: "Seek urgent medical care for new or worsening danger signs. This explanation does not diagnose concussion or provide clearance.",
    provider: "local-fallback",
    generatedAt: new Date().toISOString(),
  };
}
