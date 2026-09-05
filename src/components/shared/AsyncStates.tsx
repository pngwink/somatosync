import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-sunken)]" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-surface-sunken)]" />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-end gap-1.5 px-1", className)} role="status" aria-label="Loading chart">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-[var(--color-surface-sunken)]"
          style={{ height: `${30 + ((i * 13) % 60)}%` }}
        />
      ))}
    </div>
  );
}

interface StateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] p-5", className)}>
      <Inbox className="h-4.5 w-4.5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
      <div>
        <p className="text-[16px] font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-risk-soft)] bg-[var(--color-risk-soft)] p-5", className)}>
      <AlertTriangle className="h-4.5 w-4.5 text-[var(--color-risk)]" aria-hidden="true" />
      <div>
        <p className="text-[16px] font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
          <RefreshCw className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
