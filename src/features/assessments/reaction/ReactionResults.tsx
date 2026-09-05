import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Disclaimer } from "../../../components/shared/Disclaimer";
import { PanelDivider } from "../../../components/shared/Panel";
import {
  compareSymptoms,
  generateInterpretation,
  roundMs,
  roundPercent,
  symptomLabel,
} from "./reactionCalculations";
import { formatQualityReasonSentence } from "./reactionQuality";
import { formatDate, formatSignedPercent } from "../../../lib/utils";
import type { ReactionAssessmentResult, ReactionTrialStatus } from "./reactionTypes";
import { getReactionDashboardRow } from "./reactionStorage";

const statusLabel: Record<ReactionTrialStatus, string> = {
  valid: "Valid",
  "false-start": "False start",
  anticipatory: "Anticipatory",
  delayed: "Delayed",
  missed: "Missed",
  "focus-interrupted": "Focus interrupted",
};

interface ReactionResultsProps {
  result: ReactionAssessmentResult;
  onRetake: () => void;
}

export function ReactionResults({ result, onRetake }: ReactionResultsProps) {
  const hasResult = result.medianMs != null;
  const interpretation = generateInterpretation({
    hasEnoughValidTrials: hasResult,
    medianMs: result.medianMs,
    baselineDifferencePercent: result.baselineDifferencePercent,
    baselineSource: result.baselineSource,
    focusLossCount: result.focusLossCount,
    quality: result.quality,
  });

  const symptomComparison = compareSymptoms(result.preSymptoms, result.postSymptoms);
  const symptomsIncreased = symptomComparison.change > 0;
  const dashboardRow = getReactionDashboardRow();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Primary result</p>
        {hasResult ? (
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="font-mono text-[36px] font-semibold leading-none tracking-tight text-[var(--color-text-primary)] tabular-nums">
              {roundMs(result.medianMs)}
            </span>
            <span className="mb-0.5 text-[16px] text-[var(--color-text-tertiary)]">ms median</span>
          </div>
        ) : (
          <p className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">Not enough valid trials</p>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-[16px]">
          <div>
            <dt className="text-[var(--color-text-tertiary)]">Change from first assessment</dt>
            <dd className="text-[var(--color-text-primary)]">
              {result.baselineMs == null ? (
                "This is the starting assessment"
              ) : (
                <>
                  {formatSignedPercent(roundPercent(result.baselineDifferencePercent) ?? 0)} from {Math.round(result.baselineMs)} ms
                  {result.baselineSource === "demo" && (
                    <span className="ml-1 text-[16px] text-[var(--color-text-tertiary)]">&mdash; Maya's sample history</span>
                  )}
                </>
              )}
            </dd>
          </div>
          {result.previousAssessmentDifferencePercent != null && (
            <div>
              <dt className="text-[var(--color-text-tertiary)]">Change from previous assessment</dt>
              <dd className="text-[var(--color-text-primary)]">{formatSignedPercent(roundPercent(result.previousAssessmentDifferencePercent)!)}</dd>
            </div>
          )}
        </dl>
      </div>

      <PanelDivider />

      <div>
        <p className="mb-2 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Supporting metrics</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[16px] sm:grid-cols-3">
          <Metric label="Mean" value={result.meanMs != null ? `${roundMs(result.meanMs)} ms` : "—"} />
          <Metric label="Standard deviation" value={result.standardDeviationMs != null ? `${roundMs(result.standardDeviationMs)} ms` : "—"} />
          <Metric label="Fastest valid trial" value={result.fastestMs != null ? `${roundMs(result.fastestMs)} ms` : "—"} />
          <Metric label="Slowest valid trial" value={result.slowestMs != null ? `${roundMs(result.slowestMs)} ms` : "—"} />
          <Metric label="Valid trials" value={`${result.validReactionTimesMs.length} of 10`} />
          <Metric label="False starts" value={String(result.falseStarts)} />
          <Metric label="Missed or invalid" value={String(result.invalidTrials + result.missedTrials)} />
        </dl>
      </div>

      <PanelDivider />

      <div>
        <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Test quality</p>
        <p className="mt-1 text-[16px] text-[var(--color-text-primary)]">
          {formatQualityReasonSentence(result.quality, result.qualityReasons)}
        </p>
      </div>

      <div>
        <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Interpretation</p>
        {dashboardRow?.id === result.id && dashboardRow.interpretationLabel && (
          <Badge tone={dashboardRow.interpretationTone ?? "neutral"} showDot className="mt-1.5">
            {dashboardRow.interpretationLabel}
          </Badge>
        )}
        <p className="mt-1 max-w-2xl text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{interpretation}</p>
      </div>

      <PanelDivider />

      <div>
        <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Symptom comparison</p>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1.5 text-[16px]">
          <Metric label="Before" value={String(symptomComparison.totalBefore)} />
          <Metric label="After" value={String(symptomComparison.totalAfter)} />
          <Metric label="Change" value={symptomComparison.change > 0 ? `+${symptomComparison.change}` : String(symptomComparison.change)} />
        </div>
        {symptomComparison.increased.length > 0 && (
          <p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">
            Increased: {symptomComparison.increased.map((k) => symptomLabel(k)).join(", ")}
          </p>
        )}
        {symptomComparison.decreased.length > 0 && (
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">
            Decreased: {symptomComparison.decreased.map((k) => symptomLabel(k)).join(", ")}
          </p>
        )}
        {symptomsIncreased && (
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[var(--color-text-primary)]">
            Some symptoms increased during the assessment. Consider stopping further testing and discussing
            persistent or worsening symptoms with a qualified healthcare professional.
          </p>
        )}
      </div>

      <PanelDivider />

      <div>
        <p className="mb-2 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Trial history</p>
        <div className="overflow-hidden border border-[var(--color-border)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th scope="col" className="px-3 py-2 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Trial</th>
                <th scope="col" className="px-3 py-2 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Reaction time</th>
                <th scope="col" className="px-3 py-2 text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.trials.map((trial) => (
                <tr key={trial.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2 text-[16px] text-[var(--color-text-primary)]">{trial.trialNumber}</td>
                  <td className="px-3 py-2 font-mono text-[16px] tabular-nums text-[var(--color-text-primary)]">
                    {trial.reactionTimeMs != null ? `${Math.round(trial.reactionTimeMs)} ms` : "—"}
                  </td>
                  <td className="px-3 py-2 text-[16px] text-[var(--color-text-secondary)]">
                    {statusLabel[trial.status]}
                    {trial.focusLost && trial.status !== "focus-interrupted" && (
                      <span className="ml-1 text-[16px] text-[var(--color-text-tertiary)]">(test conditions may have affected this result)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Disclaimer variant="block" />

      <p className="text-[16px] text-[var(--color-text-tertiary)]">
        Completed {formatDate(result.completedAt, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        <Button asChild>
          <Link to="/app">Return to dashboard</Link>
        </Button>
        <Button variant="secondary" onClick={onRetake}>
          Retake assessment
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/app/assessments">View assessment history</Link>
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="font-mono tabular-nums text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
