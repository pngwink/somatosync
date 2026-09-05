import { useState } from "react";
import { CheckCircle2, VideoOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import type { AssessmentDefinition } from "../../types";

type RunnerState = "intro" | "running" | "complete" | "camera-unavailable";

interface AssessmentRunnerDialogProps {
  definition: AssessmentDefinition | null;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function AssessmentRunnerDialog({ definition, onOpenChange, onComplete }: AssessmentRunnerDialogProps) {
  const [state, setState] = useState<RunnerState>("intro");

  if (!definition) return null;

  function handleStart() {
    if (definition!.requiresDevice === "camera") {
      // Demonstrating a realistic "camera unavailable" state here since no
      // real camera/model integration exists yet in this prototype.
      setState("camera-unavailable");
      return;
    }
    setState("running");
    setTimeout(() => setState("complete"), 1800);
  }

  function handleClose(open: boolean) {
    if (!open) {
      if (state === "complete") onComplete();
      setState("intro");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={!!definition} onOpenChange={handleClose}>
      <DialogContent>
        <DialogTitle>{definition.name}</DialogTitle>
        <DialogDescription>{definition.purpose}</DialogDescription>

        <div className="mt-5">
          {state === "intro" && (
            <div className="space-y-4">
              <p className="text-[16px] text-[var(--color-text-secondary)]">
                This will take about {definition.estimatedDurationMinutes} minutes. Find a quiet, well-lit space before starting.
              </p>
              <Button className="w-full" onClick={handleStart}>
                Begin
              </Button>
            </div>
          )}

          {state === "running" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
              <p className="text-[16px] text-[var(--color-text-secondary)]">Assessment in progress…</p>
            </div>
          )}

          {state === "complete" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-9 w-9 text-[var(--color-positive)]" />
              <p className="text-[16px] font-medium text-[var(--color-text-primary)]">Assessment complete</p>
              <p className="text-[16px] text-[var(--color-text-secondary)]">Your result has been added to today's record.</p>
              <Button className="mt-2 w-full" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          )}

          {state === "camera-unavailable" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <VideoOff className="h-8 w-8 text-[var(--color-caution)]" />
              <p className="text-[16px] font-medium text-[var(--color-text-primary)]">Camera unavailable</p>
              <p className="text-[16px] text-[var(--color-text-secondary)]">
                This device's camera couldn't be accessed. Check your browser permissions or try on a device with a
                camera.
              </p>
              <Button variant="secondary" className="mt-2 w-full" onClick={() => handleClose(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
