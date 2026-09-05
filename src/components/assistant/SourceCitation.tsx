import { BookOpen, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import type { ResearchSource } from "../../types";

const typeLabels: Record<ResearchSource["type"], string> = {
  "consensus-statement": "Consensus statement",
  "public-health-guidance": "Public health guidance",
  "peer-reviewed": "Peer-reviewed research",
  "clinical-protocol": "Clinical protocol",
  "research-standard": "Research standard",
};

export function SourceCitation({ source }: { source: ResearchSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-accent-soft-border)] hover:bg-[var(--color-surface-sunken)]"
    >
      <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[14.5px] font-medium leading-snug text-[var(--color-text-primary)]">{source.title}</p>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)]" aria-hidden="true" />
        </div>
        <p className="mt-1 text-[14.5px] text-[var(--color-text-tertiary)]">
          {source.publisher} · {source.year}
        </p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{source.evidenceNote}</p>
        <Badge tone="neutral" className="mt-2">
          {typeLabels[source.type]}
        </Badge>
      </div>
    </a>
  );
}
