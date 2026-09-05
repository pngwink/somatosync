import { Keyboard, MousePointerClick, Eye } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Disclaimer } from "../../../components/shared/Disclaimer";

interface ReactionInstructionsProps {
  onBegin: () => void;
}

export function ReactionInstructions({ onBegin }: ReactionInstructionsProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
          This test measures how quickly you respond to a visual change. It takes about 3 minutes: a brief symptom
          check, two practice trials, ten recorded trials, and a second symptom check.
        </p>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">Before you start</h3>
        <ul className="space-y-1.5 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
          <li>Sit comfortably and keep this browser tab visible for the whole test.</li>
          <li>Use the same device each time so changes are easier to compare.</li>
          <li>Focus on the center of the screen where the shape will appear.</li>
          <li>Wait until the shape changes before responding &mdash; responding early counts as a false start.</li>
          <li>The test includes two practice trials followed by ten recorded trials.</li>
        </ul>
      </div>

      <div className="grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <Keyboard className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Respond using the <span className="font-medium text-[var(--color-text-primary)]">spacebar</span> or{" "}
            <span className="font-medium text-[var(--color-text-primary)]">Enter</span> key.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <p className="text-[14px] text-[var(--color-text-secondary)]">Or respond by selecting the large response area on screen.</p>
        </div>
        <div className="flex items-start gap-2.5 sm:col-span-2">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            The response area uses both shape and text to indicate state, not color alone. Screen readers will announce
            trial progress and results.
          </p>
        </div>
      </div>

      <Disclaimer variant="block">
        This assessment is a prototype. It does not diagnose a concussion, determine recovery, or provide medical
        clearance. Reaction time can be affected by sleep, device latency, distractions, caffeine, input method, and
        other factors. Results should be interpreted alongside symptoms, other assessments, and professional evaluation.
      </Disclaimer>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <p className="text-[14.5px] text-[var(--color-text-tertiary)]">Estimated time: about 3 minutes</p>
        <Button onClick={onBegin}>Begin assessment</Button>
      </div>
    </div>
  );
}
