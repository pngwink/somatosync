import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface MetricDisplayProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaTone?: "positive" | "risk" | "neutral";
  size?: "sm" | "md" | "lg";
}

export function MetricDisplay({ label, value, unit, delta, deltaTone = "neutral", size = "md" }: MetricDisplayProps) {
  const valueSize = { sm: "text-[18px]", md: "text-[26px]", lg: "text-[40px]" }[size];
  return (
    <div>
      <div className="text-[16px] font-medium text-[var(--color-text-secondary)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("font-mono font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]", valueSize)}>
          {value}
        </span>
        {unit && <span className="text-[16px] text-[var(--color-text-tertiary)]">{unit}</span>}
        {delta && (
          <span
            className={cn(
              "ml-1 font-mono text-[16px] font-medium",
              deltaTone === "positive" && "text-[var(--color-positive)]",
              deltaTone === "risk" && "text-[var(--color-risk)]",
              deltaTone === "neutral" && "text-[var(--color-text-tertiary)]"
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
