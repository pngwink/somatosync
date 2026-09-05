import { cn } from "../../lib/utils";
import type { TrendDirection } from "../../types";

const trendLabel: Record<TrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
};

const trendTone: Record<TrendDirection, string> = {
  improving: "text-[var(--color-positive)]",
  stable: "text-[var(--color-info)]",
  declining: "text-[var(--color-risk)]",
};

// Plain colored text, not a pill/badge -- matches the surrounding copy
// instead of standing out as a decorative tag.
export function TrendLabel({ trend }: { trend: TrendDirection }) {
  return <span className={cn("font-medium", trendTone[trend])}>{trendLabel[trend]}</span>;
}
