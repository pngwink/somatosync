import { Info } from "lucide-react";
import { cn } from "../../lib/utils";

interface DisclaimerProps {
  variant?: "inline" | "block";
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_TEXT =
  "This information supports a conversation with a qualified healthcare professional and is not medical clearance.";

export function Disclaimer({ variant = "inline", children, className }: DisclaimerProps) {
  const text = children ?? DEFAULT_TEXT;
  if (variant === "inline") {
    return (
      <p className={cn("flex items-start gap-1.5 text-[16px] leading-snug text-[var(--color-text-tertiary)]", className)}>
        <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </p>
    );
  }
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-info-soft)] bg-[var(--color-info-soft)] p-3.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]",
        className
      )}
      role="note"
    >
      <Info className="mt-[1px] h-4 w-4 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
