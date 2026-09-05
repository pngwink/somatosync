import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] font-semibold", {
  variants: {
    tone: {
      neutral: "bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]",
      accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
      positive: "bg-[var(--color-positive-soft)] text-[var(--color-positive)]",
      caution: "bg-[var(--color-caution-soft)] text-[var(--color-caution)]",
      risk: "bg-[var(--color-risk-soft)] text-[var(--color-risk)]",
      info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const dotTone: Record<string, string> = {
  neutral: "bg-[var(--color-text-tertiary)]",
  accent: "bg-[var(--color-accent)]",
  positive: "bg-[var(--color-positive)]",
  caution: "bg-[var(--color-caution)]",
  risk: "bg-[var(--color-risk)]",
  info: "bg-[var(--color-info)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> { showDot?: boolean; }

export function Badge({ className, tone = "neutral", showDot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, className }))} {...props}>
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", dotTone[tone ?? "neutral"])} aria-hidden="true" />}
      {children}
    </span>
  );
}
