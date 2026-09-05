import { Link } from "react-router-dom";
import type { AssessmentResult } from "../../types";
import { formatDate, formatSignedPercent, cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { interpretAssessmentResult } from "../../features/assessments/shared/resultInterpretation";

const typeLabels: Record<AssessmentResult["type"], string> = {
  "reaction-time": "Reaction Time",
  balance: "Balance",
  memory: "Learning & Recall",
  "symptom-check-in": "PCSS Symptom Scale",
};

export function AssessmentResultsTable({ results, showLink = true }: { results: AssessmentResult[]; showLink?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">
            <th scope="col" className="px-4 py-2.5 text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Assessment</th>
            <th scope="col" className="px-4 py-2.5 text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Date</th>
            <th scope="col" className="px-4 py-2.5 text-right text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Result</th>
            <th scope="col" className="px-4 py-2.5 text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">What it means</th>
            <th scope="col" className="px-4 py-2.5 text-right text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">change from start</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {results.map((r) => {
            const interpretation = interpretAssessmentResult(r);
            return (
              <tr key={r.id}>
                <th scope="row" className="px-4 py-3 text-[14.5px] font-medium text-[var(--color-text-primary)]">
                  {showLink ? (
                    <Link to="/app/assessments" className="hover:text-[var(--color-accent)] hover:underline">
                      {typeLabels[r.type]}
                    </Link>
                  ) : (
                    typeLabels[r.type]
                  )}
                </th>
                <td className="px-4 py-3 text-[14px] text-[var(--color-text-secondary)]">{formatDate(r.date)}</td>
                <td className="px-4 py-3 text-right font-mono text-[14px] tabular-nums text-[var(--color-text-primary)]">
                  {r.value} <span className="text-[var(--color-text-tertiary)]">{r.unit}</span>
                </td>
                <td className="max-w-sm px-4 py-3">
                  <Badge tone={interpretation.tone} showDot>{interpretation.label}</Badge>
                  <p className="mt-1 text-[14.5px] leading-snug text-[var(--color-text-secondary)]">{interpretation.detail}</p>
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono text-[14px] tabular-nums",
                    r.percentFromStart == null
                      ? "text-[var(--color-text-tertiary)]"
                      : r.percentFromStart >= 0
                      ? "text-[var(--color-positive)]"
                      : "text-[var(--color-caution)]"
                  )}
                >
                  {r.percentFromStart == null ? "—" : formatSignedPercent(r.percentFromStart)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
