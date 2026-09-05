import { recentAssessmentResults } from "../../data/assessments";
import { currentPatient } from "../../data/patient";
import type { AppSessionMode } from "../../lib/session";
import type { AssessmentResult, ResultTone } from "../../types";
import { getBalanceDashboardRow } from "../assessments/balance/balanceStorage";
import { getMemoryDashboardRow } from "../assessments/memory/memoryStorage";
import { getPcssDashboardRow } from "../assessments/pcss/pcssStorage";
import { getReactionDashboardRow } from "../assessments/reaction/reactionStorage";
import { loadAdaptiveSessions } from "../adaptive/neuroAdaptiveStorage";
import { buildRecoveryEvidenceSummary } from "../recovery/evidenceSummary";
import { daysSinceInjury, loadRecoveryProfile } from "../recovery/recoveryProfile";
import { currentStage, loadProtocolLogs, loadProtocolProgress, type ProtocolPathway } from "../protocols/protocolEngine";

export type ReportRange = "7d" | "14d" | "30d" | "all";

export interface ReportEvidenceItem {
  label: string;
  headline: string;
  detail: string;
  tone: ResultTone;
}

export interface ReportPathwayItem {
  label: string;
  stage: string;
}

export interface LiveReportData {
  patientName: string;
  contextLabel: string;
  recoveryDayLabel: string;
  pathwayLabel: string;
  results: AssessmentResult[];
  suggestedQuestions: string[];
  overallPattern: string;
  overallDetail: string;
  improvingEvidence: ReportEvidenceItem[];
  attentionEvidence: ReportEvidenceItem[];
  activitySummary: string;
  currentPathways: ReportPathwayItem[];
  helpfulAccommodations: string[];
  limitations: string[];
}

function cutoffForRange(range: ReportRange, now: Date): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return cutoff;
}

function filterByRange(results: AssessmentResult[], range: ReportRange, now: Date): AssessmentResult[] {
  const cutoff = cutoffForRange(range, now);
  if (!cutoff) return results;
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return results.filter((result) => result.date >= cutoffKey);
}

function inRange(iso: string, range: ReportRange, now: Date): boolean {
  const cutoff = cutoffForRange(range, now);
  if (!cutoff) return true;
  const value = new Date(iso);
  return !Number.isNaN(value.getTime()) && value >= cutoff;
}

const pathwayNames: Record<ProtocolPathway, string> = {
  learn: "Return to learning",
  "daily-life": "Work / daily life",
  play: "Return to sport",
};

function pathwayItems(): ReportPathwayItem[] {
  return (["learn", "daily-life", "play"] as ProtocolPathway[]).map((pathway) => {
    const stage = currentStage(pathway, loadProtocolProgress(pathway));
    return { label: pathwayNames[pathway], stage: `Step ${stage.step}: ${stage.title}` };
  });
}

function accommodationLabel(value: string): string {
  const labels: Record<string, string> = {
    "reduced-stimulation": "Reduced-stimulation display",
    "audio-first": "Audio-first reading support",
    standard: "Standard display",
    "larger-text": "Larger text",
    "more-spacing": "Increased line spacing",
    "soft-contrast": "Softer contrast",
    "reduce-motion": "Reduced motion",
    "text-to-speech": "Text-to-speech",
    break: "Planned quiet break",
  };
  return labels[value] ?? value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function commonHelpfulAccommodations(range: ReportRange, now: Date): string[] {
  const counts = new Map<string, number>();
  loadAdaptiveSessions()
    .filter((session) => inRange(session.completedAt, range, now))
    .flatMap((session) => session.adaptationsApplied)
    .forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([item, count]) => `${accommodationLabel(item)} (${count} session${count === 1 ? "" : "s"})`);
}

function activitySummary(range: ReportRange, now: Date): string {
  const logs = loadProtocolLogs().filter((log) => inRange(log.completedAt, range, now));
  if (logs.length === 0) return "No school, work, daily-life, or physical activity responses were logged in this range.";
  const tolerated = logs.filter((log) => log.response === "tolerated").length;
  const mild = logs.filter((log) => log.response === "mild-brief").length;
  const prolonged = logs.filter((log) => log.response === "significant-prolonged").length;
  return `${logs.length} activities logged: ${tolerated} tolerated, ${mild} with mild/brief symptom increase, and ${prolonged} with significant or prolonged symptom increase.`;
}

export function buildLiveReportData(mode: AppSessionMode, userName: string, range: ReportRange = "all", now: Date = new Date()): LiveReportData {
  const evidence = buildRecoveryEvidenceSummary();
  const improvingEvidence = evidence.domains
    .filter((domain) => domain.direction === "improving")
    .map((domain) => ({ label: domain.label, headline: domain.headline, detail: domain.detail, tone: domain.tone }));
  const attentionEvidence = evidence.domains
    .filter((domain) => domain.direction === "worsening" || (domain.id === "activity" && domain.tone === "caution"))
    .map((domain) => ({ label: domain.label, headline: domain.headline, detail: domain.detail, tone: domain.tone }));

  if (mode === "demo") {
    return {
      patientName: currentPatient.name,
      contextLabel: "Sample demo record",
      recoveryDayLabel: `Day ${currentPatient.recoveryDay}`,
      pathwayLabel: "Part-time school with supports",
      results: filterByRange(recentAssessmentResults, range, now),
      suggestedQuestions: [
        "Which school accommodations should remain in place this week?",
        "Does the activity-response pattern suggest a need for reassessment?",
        "Which domains should be repeated under professional supervision?",
      ],
      overallPattern: "Several recovery domains are improving",
      overallDetail: "The sample record shows lower symptom burden and improving reaction, memory, and balance trends, with ongoing fatigue and light sensitivity during longer school or screen activities.",
      improvingEvidence: improvingEvidence.length ? improvingEvidence : [
        { label: "Reported symptoms", headline: "Symptom burden is trending lower", detail: "Sample PCSS severity decreased across the demo timeline.", tone: "positive" },
      ],
      attentionEvidence,
      activitySummary: activitySummary(range, now),
      currentPathways: pathwayItems(),
      helpfulAccommodations: commonHelpfulAccommodations(range, now).length ? commonHelpfulAccommodations(range, now) : ["Reduced-stimulation display", "Planned rest breaks"],
      limitations: [
        "Sample data is for demonstration only.",
        "Browser-based tasks and camera measures are not diagnostic tests.",
        "The report does not provide clearance or an exact recovery date.",
      ],
    };
  }

  const results = [
    getPcssDashboardRow(),
    getReactionDashboardRow(),
    getMemoryDashboardRow(),
    getBalanceDashboardRow(),
  ].filter((result): result is AssessmentResult => result !== null);
  const profile = loadRecoveryProfile();
  const day = daysSinceInjury(profile, now);
  const pathways = pathwayItems();

  return {
    patientName: userName || "Local user",
    contextLabel: "Local prototype account",
    recoveryDayLabel: day == null ? "Not recorded" : `Day ${day}`,
    pathwayLabel: pathways.map((item) => item.stage).join(" · "),
    results: filterByRange(results, range, now),
    suggestedQuestions: [
      "Which changes in symptoms or activity tolerance should prompt follow-up?",
      "Which school, work, or daily-life accommodations are appropriate now?",
      "Which assessments should be repeated under professional supervision?",
    ],
    overallPattern: evidence.overallLabel,
    overallDetail: evidence.overallDetail,
    improvingEvidence,
    attentionEvidence,
    activitySummary: activitySummary(range, now),
    currentPathways: pathways,
    helpfulAccommodations: commonHelpfulAccommodations(range, now),
    limitations: [
      "Most information is self-reported or collected by browser-based prototype tasks.",
      "Camera and cognitive measures should be interpreted only as within-person trends.",
      "No single result, AI explanation, or pathway stage provides diagnosis or medical clearance.",
    ],
  };
}
