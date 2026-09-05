import { getActiveDataScope } from "../../lib/session";
import type { ResultTone } from "../../types";

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
      description: "For the first 24–48 hours, keep essential daily activities while reducing tasks that clearly worsen symptoms.",
      examples: ["Meals, hygiene, short conversations", "Brief walks around home", "Reduced but not zero screen use"],
    },
    {
      id: "daily-2",
      pathway: "daily-life",
      step: 2,
      title: "Light daily activity",
      description: "Add short, low-risk household and community activities that cause no more than mild and brief symptom increase.",
      examples: ["Short walk", "Simple meal preparation", "Brief errands with support"],
    },
    {
      id: "daily-3",
      pathway: "daily-life",
      step: 3,
      title: "Partial responsibilities with pacing",
      description: "Resume selected work, caregiving, household, or community responsibilities with breaks and reduced load.",
      examples: ["Short work block", "Light household task", "Reduced-duty shift or volunteer activity"],
    },
    {
      id: "daily-4",
      pathway: "daily-life",
      step: 4,
      title: "Increase duration and complexity",
      description: "Gradually add time, multitasking, travel, and environmental demands while monitoring tolerance.",
      examples: ["Longer work blocks", "Busier environments", "More complex household responsibilities"],
    },
    {
      id: "daily-5",
      pathway: "daily-life",
      step: 5,
      title: "Full regular routine",
      description: "Return to the pre-injury daily routine without new accommodations or significant symptom worsening.",
      examples: ["Regular work or caregiving hours", "Normal household duties", "Usual community activities"],
    },
  ],
  learn: [
    {
      id: "learn-1",
      pathway: "learn",
      step: 1,
      title: "Relative rest and basic learning activity",
      description: "After a short period of relative rest, begin light reading, listening, or screen activity in short blocks.",
      examples: ["5–15 minutes of reading", "Short audio lesson", "Basic homework only if tolerated"],
    },
    {
      id: "learn-2",
      pathway: "learn",
      step: 2,
      title: "Schoolwork at home",
      description: "Increase cognitive activity outside school with breaks and reduced screen or workload demands.",
      examples: ["Homework in short blocks", "Preprinted notes", "Extra time and reduced assignments"],
    },
    {
      id: "learn-3",
      pathway: "learn",
      step: 3,
      title: "Part-time school with supports",
      description: "Attend part of the day or selected classes with environmental, workload, and testing adjustments.",
      examples: ["Half day", "Rest breaks", "No tests or extended testing time"],
    },
    {
      id: "learn-4",
      pathway: "learn",
      step: 4,
      title: "Full school day with supports",
      description: "Attend the full day while temporary accommodations remain available for symptoms or fatigue.",
      examples: ["Full attendance", "Reduced homework", "Extra time and quiet testing area"],
    },
    {
      id: "learn-5",
      pathway: "learn",
      step: 5,
      title: "Full return to learning",
      description: "Resume pre-injury learning activities without new academic support or symptom-related adjustments.",
      examples: ["Normal class schedule", "Regular assignments", "Regular tests and extracurricular learning"],
    },
  ],
  play: [
    {
      id: "play-1",
      pathway: "play",
      step: 1,
      title: "Symptom-limited daily activity",
      description: "Return to normal daily activities that do not meaningfully worsen symptoms, while avoiding contact, collision, or fall risk.",
      examples: ["Walking around home", "Light daily movement", "No sport contact"],
    },
    {
      id: "play-2",
      pathway: "play",
      step: 2,
      title: "Light then moderate aerobic exercise",
      description: "Use walking, stationary cycling, or similar aerobic exercise below the level that causes significant or prolonged symptoms.",
      examples: ["Light stationary bike", "Brisk walk", "Moderate aerobic effort if light effort is tolerated"],
    },
    {
      id: "play-3",
      pathway: "play",
      step: 3,
      title: "Individual sport-specific exercise",
      description: "Add individual movement and skill work with no activity that risks head impact, collision, or a fall.",
      examples: ["Running drills", "Individual ball skills", "No contact or scrimmage"],
      requiresMedicalAuthorization: true,
    },
    {
      id: "play-4",
      pathway: "play",
      step: 4,
      title: "Non-contact training drills",
      description: "Increase exercise, coordination, and team practice while avoiding contact or collision.",
      examples: ["Complex drills", "Resistance training", "Non-contact team practice"],
      requiresMedicalAuthorization: true,
    },
    {
      id: "play-5",
      pathway: "play",
      step: 5,
      title: "Full-contact practice",
      description: "Participate in normal training only after medical clearance and full resolution under exertion.",
      examples: ["Normal practice", "Contact drills", "Restore confidence and skills"],
      requiresMedicalAuthorization: true,
    },
    {
      id: "play-6",
      pathway: "play",
      step: 6,
      title: "Return to competition",
      description: "Return to unrestricted sport after completing the graded strategy and receiving required medical clearance.",
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

export function loadProtocolProgress(pathway: ProtocolPathway): ProtocolProgress {
  if (getActiveDataScope() === "demo") {
    const stage = pathway === "learn" ? "learn-3" : pathway === "play" ? "play-2" : "daily-3";
    return { pathway, currentStageId: stage, updatedAt: "2026-07-28T07:00:00.000Z", isDemo: true };
  }
  const fallback: ProtocolProgress = {
    pathway,
    currentStageId: protocolStages[pathway][0].id,
    updatedAt: new Date(0).toISOString(),
  };
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(progressKey(pathway));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ProtocolProgress>;
    const validStage = protocolStages[pathway].some((stage) => stage.id === parsed.currentStageId);
    if (!validStage) return fallback;
    return {
      pathway,
      currentStageId: String(parsed.currentStageId),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

export function saveProtocolProgress(pathway: ProtocolPathway, currentStageId: string): ProtocolProgress {
  const validStage = protocolStages[pathway].some((stage) => stage.id === currentStageId);
  const progress: ProtocolProgress = {
    pathway,
    currentStageId: validStage ? currentStageId : protocolStages[pathway][0].id,
    updatedAt: new Date().toISOString(),
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

export function saveProtocolLog(input: Omit<ProtocolActivityLog, "id" | "completedAt" | "isDemo">): ProtocolActivityLog {
  const log: ProtocolActivityLog = {
    ...input,
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
  if (log.response === "tolerated") {
    return {
      tone: "positive",
      label: "Activity recorded as tolerated",
      detail: "No meaningful symptom increase was reported during or after this session.",
      nextAction: "Repeat the current stage as planned. Advancement should remain individualized and any required clinician authorization still applies.",
    };
  }
  if (log.response === "mild-brief") {
    return {
      tone: "info",
      label: "Mild, brief symptom increase",
      detail: "A small increase that settles within about an hour can occur during gradual return to activity.",
      nextAction: "Stay at a similar or slightly lower load until it is tolerated consistently. Do not automatically advance based on one session.",
    };
  }
  return {
    tone: "caution",
    label: "Load may have exceeded current tolerance",
    detail: "Symptoms were reported as significant, lasted longer than expected, or affected function after the session.",
    nextAction: "Stop the provoking activity, return to the last tolerated level, and contact the appropriate healthcare professional before progressing.",
  };
}

export function currentStage(pathway: ProtocolPathway, progress = loadProtocolProgress(pathway)): ProtocolStage {
  return protocolStages[pathway].find((stage) => stage.id === progress.currentStageId) ?? protocolStages[pathway][0];
}
