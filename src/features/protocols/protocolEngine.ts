import { getActiveDataScope } from "../../lib/session";
import type { ResultTone } from "../../types";
import {
  interpretActivityTolerance,
  type ActivityReturnWindow,
} from "../science/recoverySafety";

export type ProtocolPathway = "daily-life" | "learn" | "play";
export type ActivityResponse = "tolerated" | "mild-brief" | "significant-prolonged";

export interface ProtocolStage {
  id: string;
  pathway: ProtocolPathway;
  step: number;
  title: string;
  description: string;
  examples: string[];
  requiresMedicalAuthorization?: boolean;
}

export interface ProtocolProgress {
  pathway: ProtocolPathway;
  currentStageId: string;
  updatedAt: string;
  stageStartedAt: string;
  isDemo?: boolean;
}

export interface ProtocolActivityLog {
  id: string;
  pathway: ProtocolPathway;
  stageId: string;
  completedAt: string;
  activityLabel: string;
  durationMinutes: number;
  response: ActivityResponse;
  baselineSymptoms?: number;
  peakSymptoms?: number;
  returnWindow?: ActivityReturnWindow;
  notes: string;
  isDemo?: boolean;
}

export interface ProtocolCoachMessage {
  tone: ResultTone;
  label: string;
  detail: string;
  nextAction: string;
}

export const protocolStages: Record<ProtocolPathway, ProtocolStage[]> = {
  "daily-life": [
    {
      id: "daily-1",
      pathway: "daily-life",
      step: 1,
      title: "Relative rest and essential routines",
      description: "For the first 24–48 hours, keep essential daily activities and light movement while reducing tasks that clearly worsen symptoms. Complete bed rest or isolation is not the goal.",
      examples: ["Meals, hygiene, short conversations", "Brief walks", "Reduced—but not necessarily zero—screen use"],
    },
    {
      id: "daily-2",
      pathway: "daily-life",
      step: 2,
      title: "Light daily activity",
      description: "Add short, low-risk household and community activities. A mild, brief symptom increase can occur during graded activity and does not automatically mean reinjury.",
      examples: ["Short walk", "Simple meal preparation", "Brief errands with support"],
    },
    {
      id: "daily-3",
      pathway: "daily-life",
      step: 3,
      title: "Partial responsibilities with pacing",
      description: "Resume selected work, caregiving, household, or community responsibilities with breaks and a manageable load.",
      examples: ["Short work block", "Light household task", "Reduced-duty shift or volunteer activity"],
    },
    {
      id: "daily-4",
      pathway: "daily-life",
      step: 4,
      title: "Increase duration and complexity",
      description: "Gradually add time, multitasking, travel, and environmental demands while focusing on function and tolerance—not symptom perfection.",
      examples: ["Longer work blocks", "Busier environments", "More complex household responsibilities"],
    },
    {
      id: "daily-5",
      pathway: "daily-life",
      step: 5,
      title: "Full regular routine",
      description: "Work toward the pre-injury daily routine while keeping supports available if they are still useful.",
      examples: ["Regular work or caregiving hours", "Usual household duties", "Normal community activities"],
    },
  ],
  learn: [
    {
      id: "learn-1",
      pathway: "learn",
      step: 1,
      title: "Relative rest and light learning",
      description: "During the first 24–48 hours, allow light reading, listening, or brief screen activity as tolerated rather than prolonged complete cognitive rest.",
      examples: ["5–15 minutes of reading", "Short audio lesson", "Brief social or school contact"],
    },
    {
      id: "learn-2",
      pathway: "learn",
      step: 2,
      title: "Schoolwork at home",
      description: "Increase cognitive activity in manageable blocks with breaks and temporary workload or screen adjustments when useful.",
      examples: ["Homework in short blocks", "Preprinted notes", "Extra time or reduced assignments"],
    },
    {
      id: "learn-3",
      pathway: "learn",
      step: 3,
      title: "Part-time school with supports",
      description: "Return to the school environment as tolerated with temporary environmental, workload, and testing adjustments.",
      examples: ["Partial day", "Rest breaks", "Reduced testing load"],
    },
    {
      id: "learn-4",
      pathway: "learn",
      step: 4,
      title: "Full school day with supports",
      description: "Attend the full day while temporary concussion-related accommodations remain available where needed.",
      examples: ["Full attendance", "Reduced homework", "Extra time or a quieter testing area"],
    },
    {
      id: "learn-5",
      pathway: "learn",
      step: 5,
      title: "Full return to learning",
      description: "Return to pre-injury learning activities without new concussion-related academic supports. Medical clearance is not required simply to return to school.",
      examples: ["Normal class schedule", "Regular assignments", "Regular tests and learning activities"],
    },
  ],
  play: [
    {
      id: "play-1",
      pathway: "play",
      step: 1,
      title: "Symptom-limited daily activity",
      description: "Resume normal daily activity and light movement that cause no more than a mild and brief symptom increase, while avoiding contact, collision, or fall risk.",
      examples: ["Walking around home", "Light daily movement", "No contact sport"],
    },
    {
      id: "play-2",
      pathway: "play",
      step: 2,
      title: "Light then moderate aerobic exercise",
      description: "Use walking, stationary cycling, or similar low-risk aerobic exercise. Mild and brief symptom increases can be acceptable; reduce the load if symptoms rise more than mildly or remain elevated.",
      examples: ["Light stationary bike", "Brisk walk", "Moderate aerobic effort after light effort is tolerated"],
    },
    {
      id: "play-3",
      pathway: "play",
      step: 3,
      title: "Individual sport-specific exercise",
      description: "Add individual movement and skill work only when it does not introduce a risk of head impact, collision, or falling.",
      examples: ["Running drills", "Individual ball skills", "No contact or scrimmage"],
    },
    {
      id: "play-4",
      pathway: "play",
      step: 4,
      title: "Non-contact training drills",
      description: "Increase exercise, coordination, and team practice while avoiding contact. Later sport stages should remain healthcare-professional supervised.",
      examples: ["Complex drills", "Resistance training", "Non-contact team practice"],
      requiresMedicalAuthorization: true,
    },
    {
      id: "play-5",
      pathway: "play",
      step: 5,
      title: "Full-contact practice",
      description: "Return to activities with head-impact risk only after the required healthcare-professional authorization and appropriate clinical recovery criteria are met.",
      examples: ["Normal practice", "Contact drills", "Rebuild sport confidence"],
      requiresMedicalAuthorization: true,
    },
    {
      id: "play-6",
      pathway: "play",
      step: 6,
      title: "Return to competition",
      description: "Unrestricted sport follows completion of the graduated strategy and required medical clearance. SomatoSync never grants that clearance.",
      examples: ["Competition", "Unrestricted practice and play"],
      requiresMedicalAuthorization: true,
    },
  ],
};

function progressKey(pathway: ProtocolPathway) {
  return `somatosync.${getActiveDataScope()}.return-support.${pathway}.progress.v1`;
}

function logKey() {
  return `somatosync.${getActiveDataScope()}.return-support.activity-log.v1`;
}

function fallbackProgress(pathway: ProtocolPathway): ProtocolProgress {
  const first = protocolStages[pathway][0];
  const now = new Date().toISOString();
  return { pathway, currentStageId: first.id, updatedAt: now, stageStartedAt: now };
}

export function loadProtocolProgress(pathway: ProtocolPathway): ProtocolProgress {
  if (getActiveDataScope() === "demo") {
    const stage = pathway === "learn" ? "learn-3" : pathway === "play" ? "play-2" : "daily-3";
    return {
      pathway,
      currentStageId: stage,
      updatedAt: "2026-07-28T07:00:00.000Z",
      stageStartedAt: pathway === "play" ? "2026-07-27T07:00:00.000Z" : "2026-07-26T07:00:00.000Z",
      isDemo: true,
    };
  }
  const fallback = fallbackProgress(pathway);
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(progressKey(pathway));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProtocolProgress>;
    const validStage = protocolStages[pathway].some((stage) => stage.id === parsed.currentStageId);
    if (!validStage) return fallback;
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt;
    return {
      pathway,
      currentStageId: String(parsed.currentStageId),
      updatedAt,
      stageStartedAt: typeof parsed.stageStartedAt === "string" ? parsed.stageStartedAt : updatedAt,
    };
  } catch {
    return fallback;
  }
}

export function nextProtocolStage(pathway: ProtocolPathway, progress = loadProtocolProgress(pathway)) {
  const current = currentStage(pathway, progress);
  return protocolStages[pathway].find((stage) => stage.step === current.step + 1) ?? null;
}

export function saveProtocolProgress(pathway: ProtocolPathway, requestedStageId: string): ProtocolProgress {
  const current = loadProtocolProgress(pathway);
  const currentStageValue = currentStage(pathway, current);
  const requested = protocolStages[pathway].find((stage) => stage.id === requestedStageId);
  // Forward progression is deliberately sequential. A caller cannot jump from Step 1 to Step 5.
  const selected = requested && requested.step <= currentStageValue.step + 1 ? requested : currentStageValue;
  const now = new Date().toISOString();
  const progress: ProtocolProgress = {
    pathway,
    currentStageId: selected.id,
    updatedAt: now,
    stageStartedAt: selected.id === current.currentStageId ? current.stageStartedAt : now,
  };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(progressKey(pathway), JSON.stringify(progress));
    } catch {
      // Keep the current page state if storage is blocked.
    }
  }
  return progress;
}

export function loadProtocolLogs(): ProtocolActivityLog[] {
  if (getActiveDataScope() === "demo") {
    return [
      {
        id: "demo-log-1",
        pathway: "learn",
        stageId: "learn-3",
        completedAt: "2026-07-28T15:30:00.000Z",
        activityLabel: "Three morning classes with two rest breaks",
        durationMinutes: 180,
        baselineSymptoms: 3,
        peakSymptoms: 4,
        returnWindow: "15-30",
        response: "mild-brief",
        notes: "Headache increased by 1 point and settled after a 25-minute break.",
        isDemo: true,
      },
      {
        id: "demo-log-2",
        pathway: "play",
        stageId: "play-2",
        completedAt: "2026-07-27T20:00:00.000Z",
        activityLabel: "Stationary cycling",
        durationMinutes: 15,
        baselineSymptoms: 2,
        peakSymptoms: 2,
        returnWindow: "lt-15",
        response: "tolerated",
        notes: "No meaningful symptom increase.",
        isDemo: true,
      },
    ];
  }
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(logKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ProtocolActivityLog => {
        if (typeof item !== "object" || item === null) return false;
        const value = item as Record<string, unknown>;
        return (
          typeof value.id === "string" &&
          ["daily-life", "learn", "play"].includes(String(value.pathway)) &&
          typeof value.stageId === "string" &&
          typeof value.completedAt === "string" &&
          typeof value.activityLabel === "string" &&
          typeof value.durationMinutes === "number" &&
          ["tolerated", "mild-brief", "significant-prolonged"].includes(String(value.response))
        );
      })
      .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function saveProtocolLog(input: Omit<ProtocolActivityLog, "id" | "completedAt" | "isDemo" | "response">): ProtocolActivityLog {
  const baselineSymptoms = Math.max(0, Math.min(10, Math.round(input.baselineSymptoms ?? 0)));
  const peakSymptoms = Math.max(0, Math.min(10, Math.round(input.peakSymptoms ?? baselineSymptoms)));
  const interpretation = interpretActivityTolerance(baselineSymptoms, peakSymptoms, input.returnWindow ?? "not-yet");
  const log: ProtocolActivityLog = {
    ...input,
    response: interpretation.response,
    baselineSymptoms,
    peakSymptoms,
    id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    completedAt: new Date().toISOString(),
    durationMinutes: Math.max(1, Math.min(480, Math.round(input.durationMinutes))),
    notes: input.notes.trim().slice(0, 600),
    activityLabel: input.activityLabel.trim().slice(0, 120) || "Activity session",
  };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(logKey(), JSON.stringify([log, ...loadProtocolLogs()].slice(0, 100)));
    } catch {
      // Keep the result visible in-session when storage is blocked.
    }
  }
  return log;
}

export function coachMessageFor(log: ProtocolActivityLog): ProtocolCoachMessage {
  const interpreted = log.baselineSymptoms != null && log.peakSymptoms != null && log.returnWindow
    ? interpretActivityTolerance(log.baselineSymptoms, log.peakSymptoms, log.returnWindow)
    : null;
  if (log.response === "tolerated") {
    return {
      tone: "positive",
      label: interpreted?.label ?? "Activity recorded as tolerated",
      detail: interpreted?.detail ?? "No meaningful symptom increase was reported during or after this session.",
      nextAction: "Repeat or gradually build the current low-risk activity if it remains manageable. One session does not provide medical clearance.",
    };
  }
  if (log.response === "mild-brief") {
    return {
      tone: "info",
      label: interpreted?.label ?? "Mild, brief symptom increase",
      detail: interpreted?.detail ?? "A small increase that settles within about an hour can occur during gradual return to activity.",
      nextAction: "A mild, brief increase can be compatible with graded progression. Keep the load manageable and do not treat the increase itself as evidence of damage or reinjury.",
    };
  }
  return {
    tone: "caution",
    label: interpreted?.label ?? "More than mild or not brief",
    detail: interpreted?.detail ?? "Symptoms were reported as more than mild, lasted longer than about an hour, or affected function after the session.",
    nextAction: "Reduce or stop the provoking activity, return to the last manageable level, and seek appropriate clinical advice if symptoms remain elevated, worsen, or safety is a concern.",
  };
}

export function currentStage(pathway: ProtocolPathway, progress = loadProtocolProgress(pathway)): ProtocolStage {
  return protocolStages[pathway].find((stage) => stage.id === progress.currentStageId) ?? protocolStages[pathway][0];
}
