import { cn } from "../../lib/utils";

interface ProgressStepperProps {
  currentStep: number; // 1-indexed
  totalSteps: number;
  label?: string;
}

export function ProgressStepper({ currentStep, totalSteps, label }: ProgressStepperProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[14.5px] font-medium text-[var(--color-text-secondary)]">
          {label ?? `Step ${currentStep} of ${totalSteps}`}
        </span>
        <span className="font-mono text-[14.5px] text-[var(--color-text-tertiary)]">
          {currentStep}/{totalSteps}
        </span>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < currentStep ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-sunken)]"
            )}
          />
        ))}
      </div>
    </div>
  );
}
