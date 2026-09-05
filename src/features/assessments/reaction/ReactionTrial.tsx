import { cn } from "../../../lib/utils";
import { ProgressStepper } from "../../../components/shared/ProgressStepper";
import type { ReactionTrialKind } from "./reactionTypes";

type TrialDisplayPhase = "waiting" | "stimulus" | "trialFeedback";

interface ReactionTrialProps {
  displayPhase: TrialDisplayPhase;
  trialKind: ReactionTrialKind;
  trialNumber: number;
  totalForKind: number;
  feedbackText: string | null;
  onRespond: () => void;
}

export function ReactionTrial({ displayPhase, trialKind, trialNumber, totalForKind, feedbackText, onRespond }: ReactionTrialProps) {
  const label = `${trialKind === "practice" ? "Practice trial" : "Trial"} ${trialNumber} of ${totalForKind}`;

  const stateText =
    displayPhase === "waiting" ? "Wait" : displayPhase === "stimulus" ? "Respond now" : feedbackText ?? "";

  return (
    <div className="space-y-5">
      <ProgressStepper currentStep={trialNumber} totalSteps={totalForKind} label={label} />

      <p className="sr-only" aria-live="polite">
        {displayPhase === "waiting" && "Waiting for the stimulus."}
        {displayPhase === "stimulus" && "Respond now."}
        {displayPhase === "trialFeedback" && feedbackText}
      </p>

      <div className="flex flex-col items-center gap-4 py-6">
        <div
          role="button"
          tabIndex={displayPhase === "trialFeedback" ? -1 : 0}
          aria-label={displayPhase === "trialFeedback" ? "Trial feedback" : "Response area. Press when the shape changes."}
          onClick={displayPhase === "trialFeedback" ? undefined : onRespond}
          className={cn(
            "flex h-52 w-52 select-none items-center justify-center rounded-full border-2 text-[15px] font-medium transition-none sm:h-64 sm:w-64",
            displayPhase === "waiting" &&
              "cursor-pointer border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
            displayPhase === "stimulus" && "cursor-pointer border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
            displayPhase === "trialFeedback" &&
              "border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-6 text-center text-[var(--color-text-primary)]"
          )}
        >
          {stateText}
        </div>

        <p className="text-[14.5px] text-[var(--color-text-tertiary)]">
          {displayPhase === "trialFeedback"
            ? "Continuing shortly."
            : "Press the spacebar, press Enter, or select the shape when it changes."}
        </p>
      </div>
    </div>
  );
}
