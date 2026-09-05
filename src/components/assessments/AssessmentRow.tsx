import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { formatDate } from "../../lib/utils";
import type { AssessmentDefinition, AssessmentResult } from "../../types";
import { interpretAssessmentResult } from "../../features/assessments/shared/resultInterpretation";

interface AssessmentRowProps {
  definition: AssessmentDefinition;
  latestResult?: AssessmentResult;
  onStart: () => void;
}

export function AssessmentRow({ definition, latestResult, onStart }: AssessmentRowProps) {
  const interpretation = latestResult ? interpretAssessmentResult(latestResult) : null;

  return (
    <div className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{definition.name.replace(" · Experimental trend", "").replace(" · Recognized symptom instrument", "")}</h3>
          {definition.id === "symptom-check-in" ? <Badge tone="info">Recognized symptom instrument</Badge> : <Badge tone="neutral">Experimental / trend only</Badge>}
          {definition.requiresDevice && <Badge tone="neutral">{definition.requiresDevice === "camera" ? "Camera optional" : "Device"}</Badge>}
        </div>
        <p className="mt-1.5 max-w-[62ch] text-[16px] leading-6 text-[var(--color-text-secondary)]">{definition.purpose}</p>
        <p className="mt-2 text-[16px] text-[var(--color-text-tertiary)]">{definition.estimatedDurationMinutes} min · {definition.suggestedCadence ?? "As directed"}</p>

        {latestResult && interpretation ? (
          <div className="mt-4 rounded-[14px] bg-[var(--color-surface-sunken)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[16px] font-semibold tabular-nums text-[var(--color-text-primary)]">{latestResult.value} {latestResult.unit}</span>
              <Badge tone={interpretation.tone} showDot>{interpretation.label}</Badge>
            </div>
            <p className="mt-1.5 text-[16px] leading-6 text-[var(--color-text-secondary)]">{interpretation.detail}</p>
            <p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">{formatDate(latestResult.date)}</p>
          </div>
        ) : (
          <p className="mt-3 text-[16px] text-[var(--color-text-tertiary)]">No result recorded yet.</p>
        )}
      </div>

      <Button variant={latestResult ? "secondary" : "primary"} onClick={onStart} className="sm:shrink-0">
        {latestResult ? "Retake" : "Start"}
      </Button>
    </div>
  );
}
