import { ShieldOff } from "lucide-react";
import type { StorageSummary } from "./privacyTypes";
import { formatApproxBytes } from "./privacyStorage";
import { EmptyState } from "../../components/shared/AsyncStates";

const UNAVAILABLE_MESSAGE: Record<NonNullable<StorageSummary["unavailableReason"]>, string> = {
  "no-window": "Local storage isn't available in this environment.",
  "blocked-or-private-browsing":
    "Local storage appears to be blocked, possibly due to private/incognito browsing or a browser setting.",
  "unknown-error": "Local storage couldn't be read.",
};

export function PrivacySummary({ summary }: { summary: StorageSummary }) {
  if (!summary.isStorageAvailable) {
    return (
      <div
        className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-caution-soft)] bg-[var(--color-caution-soft)] p-3.5 text-[16px] leading-snug text-[var(--color-text-secondary)]"
        role="status"
      >
        <ShieldOff className="mt-[1px] h-4 w-4 shrink-0 text-[var(--color-caution)]" aria-hidden="true" />
        <span>{UNAVAILABLE_MESSAGE[summary.unavailableReason ?? "unknown-error"]}</span>
      </div>
    );
  }

  if (summary.entries.length === 0) {
    return (
      <EmptyState
        title="No SomatoSync data stored on this device"
        description="Once you complete a check-in or assessment, it will appear here."
      />
    );
  }

  const categoryRows = Object.entries(summary.categoryCounts).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-3" role="status">
      <p className="text-[16px] font-medium text-[var(--color-text-secondary)]">Stored on this device</p>
      <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {categoryRows.map(([category, count]) => (
          <div key={category} className="flex items-center justify-between py-2.5">
            <dt className="text-[16px] text-[var(--color-text-primary)]">{category}</dt>
            <dd className="font-mono text-[16px] tabular-nums text-[var(--color-text-secondary)]">
              {count} {count === 1 ? "entry" : "entries"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[16px] text-[var(--color-text-tertiary)]">
        Approximate storage used: <span className="font-mono tabular-nums">{formatApproxBytes(summary.totalApproxBytes)}</span>
      </p>
    </div>
  );
}
