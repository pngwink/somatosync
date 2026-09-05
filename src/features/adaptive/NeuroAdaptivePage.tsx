import { BrainCircuit, Camera, CheckCircle2, Type, Volume2 } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";
import { SomatoSyncShieldPanel } from "./SomatoSyncShieldPanel";
import { planAdaptiveIntervention } from "./neuroAdaptiveEngine";
import { loadAdaptiveSessions } from "./neuroAdaptiveStorage";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";
import { readCurrentPageAloud } from "./focusReadingTools";

export function NeuroAdaptivePage() {
  const {
    status,
    startMonitoring,
    turnOffFocus,
    settings,
    setSettings,
  } = useNeuroAdaptive();

  const on = status !== "off" && status !== "error";
  const currentSymptoms = getCurrentAdaptiveCheckIn();
  const startingPlan = currentSymptoms ? planAdaptiveIntervention(null, currentSymptoms) : null;
  const priorSessions = loadAdaptiveSessions();

  function togglePlainLanguage() {
    setSettings({ ...settings, plainLanguage: !settings.plainLanguage, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Adaptive interface"
        title="Focus"
        context="Turn it on once, then keep using SomatoSync normally."
      />

      <Card className="overflow-hidden border-0 bg-[var(--color-accent-soft)] p-0">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-[16px] bg-[var(--color-surface)] p-3">
              <BrainCircuit className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Focus Mode</p>
                <span className={`rounded-full px-2.5 py-1 text-[16px] font-semibold ${on ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"}`}>
                  {on ? "On" : "Off"}
                </span>
              </div>
              <h2 className="mt-2 text-[25px] font-semibold tracking-tight">An interface that can change with recovery.</h2>
              <p className="mt-2 max-w-3xl text-[16px] leading-7 text-[var(--color-text-secondary)]">
                Focus starts from confirmed symptoms, then local MediaPipe signals can refine the experience when sustained screen difficulty appears.
              </p>
              <div className="mt-5">
                {on ? (
                  <Button variant="secondary" onClick={turnOffFocus}>Turn off & restore original</Button>
                ) : (
                  <Button onClick={() => void startMonitoring()}><Camera />Turn on Focus Mode</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-positive-soft)] text-[var(--color-positive)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Your starting setup</h2>
            {startingPlan && startingPlan.changes.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {startingPlan.changes.slice(0, 5).map((change) => (
                    <span key={change} className="rounded-full bg-[var(--color-surface-sunken)] px-3 py-1.5 text-[16px] font-medium text-[var(--color-text-secondary)]">{change}</span>
                  ))}
                </div>
                {startingPlan.reasons.length > 0 && (
                  <p className="mt-3 text-[16px] leading-6 text-[var(--color-text-tertiary)]">Matched from: {startingPlan.reasons.slice(0, 3).join(" · ")}</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">No symptom-matched display changes are suggested right now. Live Focus can still watch for sustained difficulty.</p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Optional reading support</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant={settings.plainLanguage ? "secondary" : "ghost"} onClick={togglePlainLanguage} disabled={!on}><Type />{settings.plainLanguage ? "Restore wording" : "Plain language"}</Button>
            <Button size="sm" variant="ghost" onClick={readCurrentPageAloud} disabled={!on}><Volume2 />Read aloud</Button>
          </div>
        </div>
      </Card>

      <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Use Focus on other websites</summary>
        <div className="mt-4"><SomatoSyncShieldPanel /></div>
      </details>

      {priorSessions.length > 0 && (
        <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
          <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Recent Focus activity</summary>
          <div className="mt-4 divide-y divide-[var(--color-border)]">
            {priorSessions.slice(0, 3).map((session) => (
              <div key={session.id} className="py-3 text-[16px] text-[var(--color-text-secondary)]">
                <p className="font-medium text-[var(--color-text-primary)]">{new Date(session.completedAt).toLocaleDateString()}</p>
                <p className="mt-1">{session.durationSeconds}s · {session.promptCount} adaptation prompt{session.promptCount === 1 ? "" : "s"}</p>
                <p>{session.cameraUsed ? "Local camera signals used" : "Camera signals off"}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Scientific and accessibility basis</summary>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
          Focus uses symptom-informed supports for light sensitivity, fatigue, reading difficulty, and motion discomfort. Camera-derived patterns are experimental and non-diagnostic; they only help decide whether to offer additional accessibility support.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[16px] font-medium text-[var(--color-accent)]">
          <a href="https://bjsm.bmj.com/content/57/11/695" target="_blank" rel="noreferrer" className="hover:underline">Amsterdam concussion consensus</a>
          <a href="https://concussionsontario.org/concussion/guideline-section/fatigue" target="_blank" rel="noreferrer" className="hover:underline">Ontario fatigue and pacing guidance</a>
          <a href="https://pedsconcussion.com/template-for-concussion-teams-letter-to-the-child-adolescents-school/" target="_blank" rel="noreferrer" className="hover:underline">Pediatric school accommodations</a>
        </div>
      </details>

      <Disclaimer variant="block">
        Focus Mode is an experimental accessibility aid. Blink, gaze, facial movement, viewing distance, and interaction patterns are non-specific and can change because of lighting, dry eyes, stress, glasses, posture, or task difficulty. It does not diagnose fatigue, vision dysfunction, concussion, or readiness.
      </Disclaimer>
    </div>
  );
}
