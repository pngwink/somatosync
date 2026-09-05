import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/shared/AsyncStates";
import { getMostRecentReactionResult, getPreviousReactionResult } from "./reactionStorage";
import { formatDate, formatSignedPercent } from "../../../lib/utils";
import { roundMs, roundPercent, compareToReference } from "./reactionCalculations";

const qualityLabel: Record<string, string> = {
  high: "High",
  moderate: "Moderate",
  limited: "Limited",
  invalid: "Invalid",
};

/** Reads directly from reaction-time storage so it always reflects the latest saved session, including after a refresh. */
export function ReactionDashboardSummary() {
  const navigate = useNavigate();
  const latest = getMostRecentReactionResult();

  if (!latest) {
    return (
      <EmptyState
        title="No reaction time assessment recorded yet"
        description="Complete the reaction time assessment to start tracking this metric."
        action={{ label: "Take assessment", onClick: () => navigate("/app/assessments/reaction-time") }}
        className="border-0 bg-transparent p-0"
      />
    );
  }

  const previous = getPreviousReactionResult();
  const changeFromPrevious =
    previous?.medianMs != null && latest.medianMs != null ? compareToReference(latest.medianMs, previous.medianMs).differencePercent : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {latest.medianMs != null ? (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[26px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                {roundMs(latest.medianMs)}
              </span>
              <span className="text-[16px] text-[var(--color-text-tertiary)]">ms median</span>
            </div>
          ) : (
            <p className="text-[16px] font-medium text-[var(--color-text-primary)]">Not enough valid trials to interpret</p>
          )}
          <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">
            {formatDate(latest.completedAt, { month: "short", day: "numeric" })} &middot; Quality: {qualityLabel[latest.quality]}
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/app/assessments/reaction-time">Retake assessment</Link>
        </Button>
      </div>

      {latest.medianMs != null && (
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 border-t border-[var(--color-border)] pt-3 text-[16px]">
          <div>
            <dt className="text-[var(--color-text-tertiary)]">Change from first assessment</dt>
            <dd className="text-[var(--color-text-primary)]">
              {latest.baselineDifferencePercent != null
                ? formatSignedPercent(roundPercent(latest.baselineDifferencePercent)!)
                : "Starting assessment"}
            </dd>
          </div>
          {changeFromPrevious != null && (
            <div>
              <dt className="text-[var(--color-text-tertiary)]">Change from previous</dt>
              <dd className="text-[var(--color-text-primary)]">{formatSignedPercent(roundPercent(changeFromPrevious)!)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
