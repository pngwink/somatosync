import { useState } from "react";
import { Check, Eye, FileText, Pause, ShieldCheck, Volume2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";

export function FocusModeOverlay() {
  const [summaryBullets, setSummaryBullets] = useState<string[]>([]);
  const {
    status, calibrationProgress, trackingQualityPercent, estimate, promptVisible, breakSeconds,
    latestFeedback, applyPromptAdaptation, beginPromptBreak, continueWithoutChange, resumeFromBreak,
    submitPromptFeedback, stopMonitoring, adaptationActive, adaptationReasons, adaptationChanges, adaptationRecommendBreak, adaptationSource, revertLastAdaptation, settings,
  } = useNeuroAdaptive();


  function condensePage() {
    const readingSurface = document.querySelector('[data-focus-reading-surface="true"]');
    const source = readingSurface ?? document.querySelector("main");
    const paragraphs = Array.from(source?.querySelectorAll("p") ?? [])
      .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter((text) => text.length >= 80);
    const bullets = paragraphs.slice(0, 4).map((text) => {
      const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? text;
      return firstSentence.length > 180 ? `${firstSentence.slice(0, 177).trimEnd()}…` : firstSentence;
    });
    setSummaryBullets(bullets.length ? bullets : ["This page does not have enough long-form text to condense."]);
  }

  function readPageAloud() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const main = document.querySelector("main");
    const text = main?.textContent?.replace(/\s+/g, " ").trim().slice(0, 6_000) ?? "";
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function undoAdaptation() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    revertLastAdaptation();
    setSummaryBullets([]);
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
          <div className="mt-5 flex justify-center gap-2"><Button onClick={resumeFromBreak}>Resume early</Button><Button variant="ghost" onClick={stopMonitoring}>Turn off Focus Mode</Button></div>
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
            <div className="min-w-0 flex-1"><h2 className="text-[16px] font-semibold">Focus Mode noticed a sustained change</h2><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Choose an adjustment, take a break, or keep going. Nothing changes without your approval unless auto-adapt is on.</p></div>
            <button onClick={continueWithoutChange} aria-label="Dismiss" className="text-[var(--color-text-tertiary)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {estimate?.reasons.slice(0, 4).map((reason) => <div key={reason.key} className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-2.5"><p className="text-[16px] font-semibold">{reason.label}</p><p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{reason.detail}</p></div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={applyPromptAdaptation}>Apply suggested changes</Button><Button size="sm" variant="secondary" onClick={beginPromptBreak}><Pause />Take a break</Button><Button size="sm" variant="ghost" onClick={continueWithoutChange}>Keep current view</Button></div>
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <p className="text-[16px] text-[var(--color-text-tertiary)]">Did this alert match how strained you felt? Your answer helps Focus Mode personalize future prompts on this device.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant={latestFeedback === true ? "primary" : "secondary"} onClick={() => submitPromptFeedback(true)} disabled={latestFeedback !== null}><Check />Yes</Button>
              <Button size="sm" variant={latestFeedback === false ? "primary" : "secondary"} onClick={() => { submitPromptFeedback(false); if (adaptationActive) revertLastAdaptation(); continueWithoutChange(); }} disabled={latestFeedback !== null}><X />False alarm</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (adaptationActive) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[min(430px,calc(100vw-2rem))]">
        <Card className="border-[var(--color-positive)]/35 p-4 shadow-[var(--shadow-med)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[var(--color-positive-soft)] p-2"><Eye className="h-4 w-4 text-[var(--color-positive)]" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold">{adaptationSource === "symptoms" ? "Starting view matched to current symptoms" : "Focus Mode refined the reading environment"}</h2>
              <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                {adaptationSource === "symptoms"
                  ? "SomatoSync used the latest confirmed symptom record to choose a starting accessibility setup. Live signals can refine it further."
                  : settings.stabilizeViewport
                    ? "Head or gaze instability triggered a steadier viewport with motion and sticky movement reduced."
                    : settings.softContrast && settings.calmMedia
                      ? "Visual-strain signals triggered a distinct low-glare palette and substantially calmer media."
                      : settings.reduceDensity && settings.focusReadingLayout
                        ? "Cognitive-load signals reduced secondary content and isolated a clearer reading lane."
                        : "Reading typography, spacing, and hierarchy were adjusted without zooming the entire application."}
              </p>
            </div>
          </div>
          {adaptationChanges.length > 0 && (
            <div className="mt-3">
              <p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Changed</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {adaptationChanges.map((change) => <span key={change} className="rounded-full bg-[var(--color-positive-soft)] px-2.5 py-1 text-[16px] font-medium text-[var(--color-positive)]">{change}</span>)}
              </div>
            </div>
          )}
          {adaptationReasons.length > 0 && (
            <details className="mt-3 text-[16px] text-[var(--color-text-secondary)]">
              <summary className="cursor-pointer font-semibold">Why these changes?</summary>
              <ul className="mt-1.5 space-y-1 pl-4">{adaptationReasons.map((reason) => <li key={reason} className="list-disc">{reason}</li>)}</ul>
            </details>
          )}
          {adaptationRecommendBreak && <p className="mt-3 text-[16px] font-medium text-[var(--color-caution)]">A short screen break may also help this pattern.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={undoAdaptation}>Undo changes</Button>
            {(settings.reduceDensity || settings.focusReadingLayout) && <Button size="sm" variant="secondary" onClick={condensePage}><FileText />Condense page</Button>}
            {settings.textToSpeechPreferred && <Button size="sm" variant="secondary" onClick={readPageAloud}><Volume2 />Read page aloud</Button>}
            {status === "active" && <Button size="sm" variant="secondary" onClick={beginPromptBreak}><Pause />Take a break</Button>}
            {latestFeedback == null && <Button size="sm" variant="ghost" onClick={() => submitPromptFeedback(true)}><Check />This helped</Button>}
          </div>
          {summaryBullets.length > 0 && (
            <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3">
              <p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Quick reading view</p>
              <ul className="mt-2 space-y-1.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                {summaryBullets.map((bullet, index) => <li key={`${index}-${bullet.slice(0, 20)}`} className="flex gap-2"><span aria-hidden="true">•</span><span>{bullet}</span></li>)}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[16px] text-[var(--color-text-tertiary)]">Every change is reversible. These adjustments respond to a sustained session pattern, not a diagnosis.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden w-64 sm:block">
      <Card className="pointer-events-auto p-3 shadow-[var(--shadow-low)]">
        <div className="flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-positive)] opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-positive)]" /></span><p className="text-[16px] font-semibold">Focus Mode {status === "calibrating" ? "calibrating" : "on"}</p><ShieldCheck className="ml-auto h-3.5 w-3.5 text-[var(--color-positive)]" /></div>
        {status === "calibrating" ? <><Progress value={calibrationProgress} className="mt-2" /><p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">Learning your comfortable session pattern · {calibrationProgress}%</p></> : <p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">{trackingQualityPercent < 65 ? "Face tracking is limited—adjust lighting or position" : estimate?.band === "elevated" ? `${estimate.reasons.length} behavior changes noticed—checking if they persist` : estimate?.band === "possible" ? "A few small changes noticed" : "No sustained strain pattern noticed"}</p>}
      </Card>
    </div>
  );
}
