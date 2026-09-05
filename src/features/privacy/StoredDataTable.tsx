import { CheckCircle2, XCircle } from "lucide-react";
import type { StoredEntrySummary } from "./privacyTypes";
import { formatApproxBytes } from "./privacyStorage";

/**
 * A table of discovered storage entries. Deliberately shows only safe,
 * derived summary fields -- never the raw stored value -- per the
 * requirement that full entry content isn't exposed on the main page.
 */
export function StoredDataTable({ entries }: { entries: StoredEntrySummary[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">Locally stored SomatoSync data, by storage key</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
            <th scope="col" className="px-4 py-2.5 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Category
            </th>
            <th scope="col" className="px-4 py-2.5 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Storage key
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Size
            </th>
            <th scope="col" className="px-4 py-2.5 text-left text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Format
            </th>
            <th scope="col" className="px-4 py-2.5 text-left text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Last updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {entries.map((entry) => (
            <tr key={entry.key}>
              <th scope="row" className="px-4 py-3 text-[16px] font-medium text-[var(--color-text-primary)]">
                {entry.category}
                {entry.isDemoData && (
                  <span className="ml-2 text-[16px] font-normal text-[var(--color-text-tertiary)]">(demo data)</span>
                )}
              </th>
              <td className="px-4 py-3 font-mono text-[16px] text-[var(--color-text-secondary)]">{entry.key}</td>
              <td className="px-4 py-3 text-right font-mono text-[16px] tabular-nums text-[var(--color-text-primary)]">
                {formatApproxBytes(entry.approxBytes)}
              </td>
              <td className="px-4 py-3 text-[16px] text-[var(--color-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  {entry.isValidJson ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-positive)]" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-caution)]" aria-hidden="true" />
                  )}
                  <span>{entry.isValidJson ? "Readable" : "Unreadable"}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-[16px] text-[var(--color-text-secondary)]">
                {entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
