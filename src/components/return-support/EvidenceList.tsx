import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

interface EvidenceListProps {
  items: string[];
  tone: "supporting" | "caution";
  title: string;
}

export function EvidenceList({ items, tone, title }: EvidenceListProps) {
  const Icon = tone === "supporting" ? CheckCircle2 : AlertTriangle;
  return (
    <div>
      <p className={cn("text-[16px] font-medium uppercase tracking-wide", tone === "supporting" ? "text-[var(--color-positive)]" : "text-[var(--color-caution)]")}>
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[16px] leading-snug text-[var(--color-text-primary)]">
            <Icon
              className={cn("mt-[2px] h-3.5 w-3.5 shrink-0", tone === "supporting" ? "text-[var(--color-positive)]" : "text-[var(--color-caution)]")}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
