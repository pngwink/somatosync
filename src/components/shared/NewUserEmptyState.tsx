import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Button } from "../ui/button";
import { Panel } from "./Panel";

interface NewUserEmptyStateProps {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function NewUserEmptyState({
  title = "No recovery data yet",
  description = "Complete your first check-in and assessment to begin tracking changes over time.",
  primaryHref = "/app/check-in",
  primaryLabel = "Start first check-in",
  secondaryHref = "/app/assessments",
  secondaryLabel = "View assessments",
}: NewUserEmptyStateProps) {
  return (
    <Panel title={title} description={description}>
      <div className="flex flex-col items-start gap-4 py-5">
        <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent)]">
          <ClipboardList className="h-5 w-5" />
        </div>
        <p className="max-w-xl text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
          Your account starts blank. Your first completed assessment becomes the starting point, and later results are
          compared with your earlier assessments.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryHref && secondaryLabel && (
            <Button variant="secondary" asChild>
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
