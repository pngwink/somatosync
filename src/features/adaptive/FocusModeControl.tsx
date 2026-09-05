import { useState } from "react";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";
import { planAdaptiveIntervention } from "./neuroAdaptiveEngine";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";

export function FocusModeControl() {
  const [open, setOpen] = useState(false);
  const {
    status, calibrationProgress, trackingQualityPercent, estimate, error,
    settings, setSettings, startMonitoring, turnOffFocus,
  } = useNeuroAdaptive();
  const on = status !== "off" && status !== "error";
  const label = status === "starting" ? "Starting…" : status === "calibrating" ? "Calibrating…" : status === "paused" ? "Resuming…" : status === "break" ? "Focus paused" : status === "active" ? "Focus on" : on ? "Focus on" : "Focus Mode";
  const currentSymptoms = open ? getCurrentAdaptiveCheckIn() : null;
  const symptomSeed = currentSymptoms ? planAdaptiveIntervention(null, currentSymptoms) : null;

  async function start() {
    setOpen(false);
    await startMonitoring(currentSymptoms ?? undefined);
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-[16px] font-semibold transition-colors sm:px-3",
            on
              ? "border-[var(--color-positive)]/35 bg-[var(--color-positive)]/10 text-[var(--color-positive)]"
              : status === "error"
                ? "border-[var(--color-risk)]/35 bg-[var(--color-risk)]/10 text-[var(--color-risk)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]",
          )}
          aria-label="Open Focus Mode controls"
        >
          {status === "starting" || status === "calibrating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
          <span className="hidden sm:inline">{label}</span>
          {on && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>Focus Mode</DialogTitle>
        <DialogDescription>
          Turn it on, then use SomatoSync normally. Focus starts from confirmed symptoms and can refine the interface when sustained visual difficulty appears.
        </DialogDescription>

        {!on && symptomSeed && symptomSeed.changes.length > 0 && (
          <div className="mt-5 rounded-[16px] border border-[var(--color-positive)]/30 bg-[var(--color-positive-soft)] p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-positive)]" />
              <div>
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Start from your current symptoms</p>
                <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Focus begins with a symptom-matched accessibility setup, then live camera signals can refine only what still seems difficult.</p>
                {symptomSeed.reasons.length > 0 && <p className="mt-2 text-[16px] font-medium text-[var(--color-text-secondary)]">Why: {symptomSeed.reasons.slice(0, 3).join(" · ")}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {symptomSeed.changes.slice(0, 5).map((change) => <span key={change} className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[16px] font-medium text-[var(--color-text-secondary)]">{change}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}


        <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-4 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">How it works:</span> after a short local calibration, keep using the app normally. Focus only reacts to sustained patterns, and you can undo any adaptation.
        </div>

        {status === "calibrating" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="flex justify-between text-[16px]"><span>Creating same-session reference</span><span>{calibrationProgress}%</span></div>
            <Progress value={calibrationProgress} className="mt-2" />
            <p className="mt-2 text-[16px] text-[var(--color-text-tertiary)]">Sit normally and look at the screen for about 12 seconds.</p>
          </div>
        )}

        {status === "paused" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] p-4 text-[16px]">
            <p className="font-semibold text-[var(--color-text-primary)]">Monitoring paused for tab switching</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">Camera analysis is suspended while the tab is inactive. After returning, SomatoSync waits about 3 seconds before evaluating reading behavior again.</p>
          </div>
        )}

        {status === "active" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-positive)]/30 bg-[var(--color-positive)]/5 p-4 text-[16px]">
            <p className="font-semibold text-[var(--color-text-primary)]">Watching for sustained screen difficulty</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">{trackingQualityPercent < 65 ? "Face tracking is limited—adjust lighting or position." : estimate?.band === "elevated" ? "A sustained visual-use change is being checked." : estimate?.band === "possible" ? "A few small changes were noticed." : "Screen use looks steady right now."}</p>
          </div>
        )}

        {status === "error" && <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-risk-soft)] p-3 text-[16px] text-[var(--color-risk)]">{error || "Focus Mode could not start."}</p>}

        <div className="mt-5 flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <div><p className="text-[16px] font-semibold">Adapt automatically</p><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-tertiary)]">Apply only matching changes after a sustained pattern. Undo is always available.</p></div>
          <Switch checked={settings.autoAdapt} onCheckedChange={(autoAdapt) => setSettings({ ...settings, autoAdapt, updatedAt: new Date().toISOString() })} aria-label="Automatically apply matching reading support" />
        </div>

        <div className="mt-5">
          {on ? <Button variant="destructive" onClick={() => { turnOffFocus(); setOpen(false); }}>Turn off & restore original</Button> : <Button onClick={() => void start()}>Turn on Focus Mode</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
