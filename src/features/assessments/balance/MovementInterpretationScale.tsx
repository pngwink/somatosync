import { AlertTriangle, CheckCircle2, Eye, type LucideIcon } from "lucide-react";
import type { BalanceMovementBand } from "./balanceTypes";

const MAX_DISPLAY_PERCENT = 2.5;

const interpretation = {
  lower: {
    title: "Lower observed movement",
    plain: "Steadier recording",
    guidance: "Your side-to-side movement was in the lower prototype range for this recording setup.",
    icon: CheckCircle2,
    toneClass: "text-[var(--color-positive)] bg-[var(--color-positive-soft)] border-[var(--color-positive)]/30",
  },
  moderate: {
    title: "Moderate observed movement",
    plain: "Watch the trend",
    guidance: "Movement was between the lower and higher prototype ranges. Compare future sessions under the same setup.",
    icon: Eye,
    toneClass: "text-[var(--color-caution)] bg-[var(--color-caution-soft)] border-[var(--color-caution)]/30",
  },
  higher: {
    title: "Higher observed movement",
    plain: "Elevated movement",
    guidance: "More side-to-side movement was detected. Repeat only if safe and discuss persistent dizziness or instability with a clinician.",
    icon: AlertTriangle,
    toneClass: "text-[var(--color-risk)] bg-[var(--color-risk-soft)] border-[var(--color-risk)]/30",
  },
  insufficient: {
    title: "Recording quality too low",
    plain: "Try again",
    guidance: "There were not enough reliable camera samples to interpret this recording.",
    icon: AlertTriangle,
    toneClass: "text-[var(--color-caution)] bg-[var(--color-caution-soft)] border-[var(--color-caution)]/30",
  },
} satisfies Record<BalanceMovementBand, {
  title: string;
  plain: string;
  guidance: string;
  icon: LucideIcon;
  toneClass: string;
}>;

export function MovementInterpretationScale({
  value,
  band,
}: {
  value: number;
  band: BalanceMovementBand;
}) {
  const details = interpretation[band];
  const Icon = details.icon;
  const marker = Math.max(1, Math.min(99, (value / MAX_DISPLAY_PERCENT) * 100));

  return (
    <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Plain-language interpretation</p>
          <h3 className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">{details.title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[16px] font-semibold ${details.toneClass}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {details.plain}
        </span>
      </div>

      {band !== "insufficient" && (
        <div className="mt-5">
          <div
            className="relative h-3 overflow-visible rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(to right, var(--color-positive) 0%, var(--color-positive) 26%, var(--color-caution) 26%, var(--color-caution) 60%, var(--color-risk) 60%, var(--color-risk) 100%)",
            }}
          >
            <span
              className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[var(--color-text-primary)] shadow"
              style={{ left: `${marker}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 grid grid-cols-3 text-[16px] font-medium text-[var(--color-text-tertiary)]">
            <span>Lower (&lt;0.65%)</span>
            <span className="text-center">Moderate</span>
            <span className="text-right">Higher (≥1.5%)</span>
          </div>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
            Your result: <span className="font-mono font-semibold tabular-nums text-[var(--color-text-primary)]">{value.toFixed(2)}%</span>. {details.guidance}
          </p>
        </div>
      )}

      {band === "insufficient" && (
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{details.guidance}</p>
      )}

      <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-tertiary)]">
        These are prototype recording bands, not clinical normal ranges or a pass/fail result.
      </p>
    </div>
  );
}
