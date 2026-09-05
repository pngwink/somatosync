import { Check, Eye, Pause, ShieldCheck, Type, Volume2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";
import { readCurrentPageAloud, stopReadingAloud } from "./focusReadingTools";

export function FocusModeOverlay() {
  const {
    status, calibrationProgress, trackingQualityPercent, estimate, promptVisible, breakSeconds, error,
    latestFeedback, applyPromptAdaptation, beginPromptBreak, continueWithoutChange, resumeFromBreak,
    submitPromptFeedback, turnOffFocus, adaptationActive, adaptationReasons, adaptationChanges,
    adaptationRecommendBreak, adaptationSource, revertLastAdaptation, settings, setSettings,
  } = useNeuroAdaptive();

  function togglePlainLanguage() {
    setSettings({ ...settings, plainLanguage: !settings.plainLanguage, updatedAt: new Date().toISOString() });
  }

  function undoAdaptation() {
    stopReadingAloud();
    revertLastAdaptation();
  }

  if ((status === "off" || status === "error") && !adaptationActive) return null;

  if (status === "paused") {
    return (
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 w-[min(430px,calc(100vw-2rem))]">
        <Card className="pointer-events-auto border-[var(--color-border-strong)] p-4 shadow-[var(--shadow-med)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-surface-sunken)] p-2"><Pause className="h-4 w-4 text-[var(--color-accent)]" /></div>
            <div><h2 className="text-[16px] font-semibold">Focus Mode resuming</h2><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Camera analysis was suspended while this tab was inactive. SomatoSync is giving you a short settling period before evaluating reading patterns again.</p></div>
          </div>
        </Card>
      </div>
    );
  }

  if (status === "break") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/96 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-lg p-7 text-center shadow-[var(--shadow-med)]">
          <Pause className="mx-auto h-9 w-9 text-[var(--color-accent)]" />
          <h2 className="mt-4 text-[20px] font-semibold">Quiet screen break</h2>
          <p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">Look away from the display, relax your shoulders, and resume when comfortable.</p>
          <p className="mt-5 font-mono text-[38px] font-semibold tabular-nums">{Math.floor(breakSeconds / 60)}:{String(breakSeconds % 60).padStart(2, "0")}</p>
          <div className="mt-5 flex justify-center gap-2"><Button onClick={resumeFromBreak}>Resume early</Button><Button variant="ghost" onClick={turnOffFocus}>Turn off & restore</Button></div>
        </Card>
      </div>
    );
  }

  if (promptVisible) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[min(440px,calc(100vw-2rem))]">
        <Card className="border-[var(--color-caution)]/40 p-5 shadow-[var(--shadow-med)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-caution-soft)] p-2"><Eye className="h-5 w-5 text-[var(--color-caution)]" /></div>
            <div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold">Focus Mode noticed a sustained change</h2><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Apply the matched support or dismiss it. Nothing changes without your approval unless auto-adapt is on.</p></div>
            <button onClick={continueWithoutChange} aria-label="Dismiss" className="text-[var(--color-text-tertiary)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {estimate?.reasons.slice(0, 4).map((reason) => <div key={reason.key} className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-2.5"><p className="text-[16px] font-semibold">{reason.label}</p><p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{reason.detail}</p></div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={applyPromptAdaptation}>Adapt interface</Button>
            <Button size="sm" variant="secondary" onClick={() => { submitPromptFeedback(false); continueWithoutChange(); }}>Doesn’t match</Button>
            {adaptationRecommendBreak && <Button size="sm" variant="ghost" onClick={beginPromptBreak}><Pause />Take a break</Button>}
          </div>
        </Card>
      </div>
    );
  }

  if (adaptationActive) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[min(440px,calc(100vw-2rem))]">
        <Card className="border-[var(--color-positive)]/35 p-4 shadow-[var(--shadow-med)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-positive-soft)] p-2"><Eye className="h-4 w-4 text-[var(--color-positive)]" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold">{adaptationSource === "symptoms" ? "Starting view matched to current symptoms" : "Focus Mode refined the interface"}</h2>
              <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                {adaptationSource === "symptoms"
                  ? "Your confirmed symptoms set the starting view. Live signals can refine it further as you use SomatoSync."
                  : settings.photophobiaMode
                    ? "Light-sensitivity support lowered page luminance and media intensity while preserving readable contrast and navigation."
                    : settings.stabilizeViewport
                      ? "Head or gaze changes reduced motion and steadied the viewport without removing navigation."
                      : settings.softContrast && settings.calmMedia
                        ? "Visual-use signals lowered luminance and saturation while calming bright media."
                        : settings.reduceDensity && settings.focusReadingLayout
                          ? "Cognitive-load signals removed optional helper copy, strengthened hierarchy, and focused the reading area."
                          : "Reading typography, spacing, and hierarchy were adjusted without zooming the whole app."}
              </p>
            </div>
          </div>

          {adaptationChanges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {adaptationChanges.slice(0, 5).map((change) => <span key={change} className="rounded-full bg-[var(--color-positive-soft)] px-2.5 py-1 text-[16px] font-medium text-[var(--color-positive)]">{change}</span>)}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" variant={settings.plainLanguage ? "secondary" : "ghost"} onClick={togglePlainLanguage}><Type />{settings.plainLanguage ? "Restore wording" : "Plain language"}</Button>
            <Button size="sm" variant="ghost" onClick={readCurrentPageAloud}><Volume2 />Read aloud</Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {latestFeedback == null && adaptationSource !== "symptoms" && <Button size="sm" onClick={() => submitPromptFeedback(true)}><Check />Keep this setup</Button>}
            <Button size="sm" variant="secondary" onClick={undoAdaptation}>Undo changes</Button>
            {status === "active" && <Button size="sm" variant="ghost" onClick={beginPromptBreak}><Pause />Take a break</Button>}
          </div>

          {adaptationReasons.length > 0 && (
            <details className="mt-3 text-[16px] text-[var(--color-text-secondary)]">
              <summary className="cursor-pointer font-semibold">Why these changes?</summary>
              <ul className="mt-1.5 space-y-1 pl-4">{adaptationReasons.map((reason) => <li key={reason} className="list-disc">{reason}</li>)}</ul>
            </details>
          )}

          <p className="mt-3 text-[16px] text-[var(--color-text-tertiary)]">Local, reversible accessibility support—not a diagnosis.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden w-64 sm:block">
      <Card className="pointer-events-auto p-3 shadow-[var(--shadow-low)]">
        <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-positive)] opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-positive)]" /></span><p className="text-[16px] font-semibold">Focus Mode {status === "calibrating" ? "calibrating" : "on"}</p><ShieldCheck className="ml-auto h-3.5 w-3.5 text-[var(--color-positive)]" /></div>
        {status === "calibrating" ? <><Progress value={calibrationProgress} className="mt-2" /><p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">Learning your comfortable session pattern · {calibrationProgress}%</p></> : <p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">{error ? "Focus is on · camera monitoring is optional and currently off" : trackingQualityPercent < 65 ? "Camera tracking is limited—adjust lighting or position" : estimate?.band === "elevated" ? `${estimate.reasons.length} behavior changes noticed—checking if they persist` : estimate?.band === "possible" ? "A few small interaction changes noticed" : "No sustained interaction-difficulty pattern noticed"}</p>}
      </Card>
    </div>
  );
}
