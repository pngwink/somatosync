import type { ResultTone } from "../../types";
import { loadBalanceHistory } from "../assessments/balance/balanceStorage";
import { loadMemoryHistory } from "../assessments/memory/memoryStorage";
import { loadPcssHistory } from "../assessments/pcss/pcssStorage";
import { loadReactionHistory } from "../assessments/reaction/reactionStorage";
import { evaluateUnexpectedChange } from "./robustAnomaly";

export interface RecoveryChangeAlert {
  id: string;
  domain: "symptoms" | "reaction" | "memory" | "balance";
  title: string;
  detail: string;
  tone: ResultTone;
  priorSampleCount: number;
  deviationScore: number;
}

interface MetricDefinition {
  domain: RecoveryChangeAlert["domain"];
  label: string;
  unit: string;
  higherIsWorse: boolean;
  values: Array<{ completedAt: string; value: number }>;
  format(value: number): string;
  minimumAbsoluteChange: number;
  minimumRelativeChange: number;
}

function newestFirst<T extends { completedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
}

function metricDefinitions(): MetricDefinition[] {
  const pcss = newestFirst(loadPcssHistory());
  const reaction = newestFirst(loadReactionHistory().filter((item) => item.medianMs != null));
  const memory = newestFirst(loadMemoryHistory());
  const balance = newestFirst(loadBalanceHistory().filter((item) => item.trackingQualityPercent >= 65));

  return [
    {
      domain: "symptoms",
      label: "Reported symptoms",
      unit: "PCSS points",
      higherIsWorse: true,
      values: pcss.map((item) => ({ completedAt: item.completedAt, value: item.totalSeverity })),
      format: (value) => `${Math.round(value)} of 132`,
      minimumAbsoluteChange: 8,
      minimumRelativeChange: 20,
    },
    {
      domain: "reaction",
      label: "Reaction time",
      unit: "ms",
      higherIsWorse: true,
      values: reaction.map((item) => ({ completedAt: item.completedAt, value: item.medianMs ?? 0 })),
      format: (value) => `${Math.round(value)} ms`,
      minimumAbsoluteChange: 45,
      minimumRelativeChange: 15,
    },
    {
      domain: "memory",
      label: "Delayed recall",
      unit: "words",
      higherIsWorse: false,
      values: memory.map((item) => ({ completedAt: item.completedAt, value: item.delayedCorrect })),
      format: (value) => `${Math.round(value)} of 10 words`,
      minimumAbsoluteChange: 2,
      minimumRelativeChange: 25,
    },
    {
      domain: "balance",
      label: "Camera-recorded movement",
      unit: "% frame",
      higherIsWorse: true,
      values: balance.map((item) => ({ completedAt: item.completedAt, value: item.lateralRmsPercent })),
      format: (value) => `${value.toFixed(2)}% of frame width`,
      minimumAbsoluteChange: 0.18,
      minimumRelativeChange: 30,
    },
  ];
}

export function detectUnexpectedRecoveryChanges(): RecoveryChangeAlert[] {
  const alerts: RecoveryChangeAlert[] = [];

  for (const metric of metricDefinitions()) {
    if (metric.values.length < 5) continue;
    const current = metric.values[0].value;
    const prior = metric.values.slice(1, 8).map((item) => item.value);
    if (prior.length < 4) continue;

    const evaluation = evaluateUnexpectedChange(
      current,
      prior,
      metric.higherIsWorse,
      metric.minimumAbsoluteChange,
      metric.minimumRelativeChange
    );
    if (!evaluation.isUnexpected) continue;

    alerts.push({
      id: `change-${metric.domain}`,
      domain: metric.domain,
      title: `${metric.label} changed more than usual`,
      detail: `The latest result was ${metric.format(current)}, compared with a recent median of ${metric.format(evaluation.reference)} across ${prior.length} sessions. Recheck under similar conditions and consider discussing a persistent change with a healthcare professional.`,
      tone: metric.domain === "balance" ? "info" : "caution",
      priorSampleCount: prior.length,
      deviationScore: Number(evaluation.score.toFixed(2)),
    });
  }

  return alerts.slice(0, 3);
}
