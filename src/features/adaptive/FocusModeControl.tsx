import { useState } from "react";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";
import { buildAdaptivePreflightSuggestion } from "./adaptivePreflight";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";

export function FocusModeControl() {
  const [open, setOpen] = useState(false);
  const {
    status, calibrationProgress, trackingQualityPercent, estimate, error,
    settings, setSettings, startMonitoring, stopMonitoring,
  } = useNeuroAdaptive();
  const on = status !== "off" && status !== "error";
  const label = status === "starting" ? "Starting…" : status === "calibrating" ? "Calibrating…" : status === "paused" ? "Resuming…" : status === "break" ? "Focus paused" : status === "active" ? "Watching" : on ? "Focus on" : "Focus Mode";
  const preflight = open ? buildAdaptivePreflightSuggestion(settings) : null;

  async function start() {
    setOpen(false);
    await startMonitoring();
  }

  async function startWithPreflight() {
    if (preflight) setSettings(preflight.settings);
    setOpen(false);
    await startMonitoring();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-[14.5px] font-semibold transition-colors sm:px-3",
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
          Watches for sustained reading difficulty and suggests only the display changes that match the pattern.
        </DialogDescription>

        {!on && preflight && (
          <div className="mt-5 rounded-[16px] border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" />
              <div>
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{preflight.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{preflight.detail}</p>
                <p className="mt-2 text-[14.5px] text-[var(--color-text-tertiary)]">{preflight.changes.slice(0, 4).join(" · ")}</p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => void startWithPreflight()}>Use setup and start</Button>
          </div>
        )}

        <ol className="mt-5 grid gap-2 text-[14.5px] text-[var(--color-text-secondary)] sm:grid-cols-3">
          <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3"><span className="font-semibold text-[var(--color-text-primary)]">1. Set up</span><br />Look at the screen normally for 12 seconds.</li>
          <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3"><span className="font-semibold text-[var(--color-text-primary)]">2. Keep reading</span><br />A quick movement never triggers a change.</li>
          <li className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3"><span className="font-semibold text-[var(--color-text-primary)]">3. Stay in control</span><br />Apply, undo, pause, or ignore a suggestion.</li>
        </ol>

        {status === "calibrating" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="flex justify-between text-[14.5px]"><span>Creating same-session reference</span><span>{calibrationProgress}%</span></div>
            <Progress value={calibrationProgress} className="mt-2" />
            <p className="mt-2 text-[14.5px] text-[var(--color-text-tertiary)]">Sit normally and look at the screen for about 12 seconds.</p>
          </div>
        )}

        {status === "paused" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] p-4 text-[14.5px]">
            <p className="font-semibold text-[var(--color-text-primary)]">Monitoring paused for tab switching</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">Camera analysis is suspended while the tab is inactive. After returning, SomatoSync waits about 3 seconds before evaluating reading behavior again.</p>
          </div>
        )}

        {status === "active" && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-positive)]/30 bg-[var(--color-positive)]/5 p-4 text-[14.5px]">
            <p className="font-semibold text-[var(--color-text-primary)]">Watching for sustained reading difficulty</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">{trackingQualityPercent < 65 ? "Face tracking is limited—adjust lighting or position." : estimate?.band === "elevated" ? "A sustained reading change is being checked." : estimate?.band === "possible" ? "A few small changes were noticed." : "Reading looks steady right now."}</p>
          </div>
        )}

        {status === "error" && <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-risk-soft)] p-3 text-[14.5px] text-[var(--color-risk)]">{error || "Focus Mode could not start."}</p>}

        <div className="mt-5 flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <div><p className="text-[15px] font-semibold">Adapt automatically</p><p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-tertiary)]">Apply only matching changes after a sustained pattern. Undo is always available.</p></div>
          <Switch checked={settings.autoAdapt} onCheckedChange={(autoAdapt) => setSettings({ ...settings, autoAdapt, updatedAt: new Date().toISOString() })} aria-label="Automatically apply matching reading support" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {on ? <Button variant="destructive" onClick={() => { stopMonitoring(); setOpen(false); }}>Turn off Focus Mode</Button> : <Button variant={preflight ? "secondary" : "default"} onClick={() => void start()}>{preflight ? "Start without setup" : "Turn on Focus Mode"}</Button>}
          <Button variant="ghost" asChild><Link to="/app/neuro-adaptive" onClick={() => setOpen(false)}>Open reading lab</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
