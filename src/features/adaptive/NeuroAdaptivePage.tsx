import { BrainCircuit, Camera, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";
import { SomatoSyncShieldPanel } from "./SomatoSyncShieldPanel";
import { planAdaptiveIntervention } from "./neuroAdaptiveEngine";
import { loadAdaptiveSessions } from "./neuroAdaptiveStorage";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";

export function NeuroAdaptivePage() {
  const {
    status,
    startMonitoring,
    turnOffFocus,
  } = useNeuroAdaptive();

  const on = status !== "off" && status !== "error";
  const currentSymptoms = getCurrentAdaptiveCheckIn();
  const startingPlan = currentSymptoms ? planAdaptiveIntervention(null, currentSymptoms) : null;
  const priorSessions = loadAdaptiveSessions();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Adaptive interface"
        title="Focus"
        context="Turn Focus on, then use SomatoSync normally. No separate reading test is required."
      />

      <Card className="overflow-hidden border-0 bg-[var(--color-accent-soft)] p-0">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-[16px] bg-[var(--color-surface)] p-3">
              <BrainCircuit className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Focus Mode</p>
                <span className={`rounded-full px-2.5 py-1 text-[16px] font-semibold ${on ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"}`}>
                  {on ? "On" : "Off"}
                </span>
              </div>
              <h2 className="mt-2 text-[25px] font-semibold tracking-tight">Turn it on once. Then leave this page and keep using the app.</h2>
              <p className="mt-3 text-[16px] leading-7 text-[var(--color-text-secondary)]">
                Focus starts from your latest confirmed symptoms, then local face-landmark signals can refine only the parts of the interface that still seem difficult. It is an accessibility layer for normal use—not another assessment.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <FocusStep number="1" title="Starts from symptoms" text="Uses confirmed check-ins and post-task symptom updates to choose a starting interface." />
            <FocusStep number="2" title="Adapts during use" text="MediaPipe runs locally and looks for sustained visual-use changes such as close viewing or squinting." />
            <FocusStep number="3" title="Restores cleanly" text="Changes stay reversible. Turning Focus off stops monitoring and returns the original interface." />
          </div>

          <div className="mt-6">
            {on ? (
              <Button variant="secondary" onClick={turnOffFocus}>Turn off & restore original</Button>
            ) : (
              <Button onClick={() => void startMonitoring()}><Camera />Turn on Focus Mode</Button>
            )}
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
                <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">Based on your latest confirmed symptoms, Focus can begin with these supports:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {startingPlan.changes.slice(0, 6).map((change) => (
                    <span key={change} className="rounded-full bg-[var(--color-surface-sunken)] px-3 py-1.5 text-[16px] font-medium text-[var(--color-text-secondary)]">{change}</span>
                  ))}
                </div>
                {startingPlan.reasons.length > 0 && (
                  <p className="mt-3 text-[16px] leading-6 text-[var(--color-text-tertiary)]">Matched from: {startingPlan.reasons.slice(0, 3).join(" · ")}</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">No symptom-matched display changes are suggested right now. Focus can still watch for sustained difficulty during use.</p>
            )}
          </div>
        </div>
      </Card>

      <section aria-label="SomatoSync Shield" className="pt-1">
        <div className="mb-3">
          <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Carry Focus to other websites</h2>
          <p className="mt-1 max-w-3xl text-[16px] leading-6 text-[var(--color-text-secondary)]">Shield can carry your current accessibility setup to compatible websites after you approve that site.</p>
        </div>
        <SomatoSyncShieldPanel />
      </section>

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
          Focus uses symptom-informed accommodations for visual sensitivity, fatigue, reading difficulty, and motion discomfort. Camera-derived patterns are experimental and non-diagnostic; they only help decide whether to offer additional accessibility support.
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

function FocusStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-[16px] bg-[var(--color-surface)]/85 p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[16px] font-bold text-white">{number}</span>
      <p className="mt-3 text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  );
}
