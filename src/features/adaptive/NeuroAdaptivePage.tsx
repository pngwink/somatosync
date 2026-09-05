import type { ReactNode } from "react";
import { BrainCircuit, Camera, CheckCircle2, Eye, Settings2, Type, Volume2 } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";
import { SomatoSyncShieldPanel } from "./SomatoSyncShieldPanel";
import { planAdaptiveIntervention } from "./neuroAdaptiveEngine";
import { loadAdaptiveSessions } from "./neuroAdaptiveStorage";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";
import { readCurrentPageAloud, stopReadingAloud } from "./focusReadingTools";

type DensityChoice = "standard" | "reduced" | "minimal";
type TextChoice = "standard" | "large" | "extra-large";

export function NeuroAdaptivePage() {
  const {
    status,
    startMonitoring,
    turnOffFocus,
    settings,
    setSettings,
    error,
  } = useNeuroAdaptive();

  const on = status !== "off" && status !== "error";
  const currentSymptoms = getCurrentAdaptiveCheckIn();
  const startingPlan = currentSymptoms ? planAdaptiveIntervention(null, currentSymptoms) : null;
  const priorSessions = loadAdaptiveSessions();
  const recentSessions = priorSessions.slice(0, 3);
  const recentSessionsManageable = recentSessions.length >= 3
    && recentSessions.every((session) => session.promptCount <= 1 && session.maxStrainScore < 60);

  const density: DensityChoice = settings.reduceDensity
    ? (settings.focusReadingLayout && settings.emphasizeStructure ? "minimal" : "reduced")
    : "standard";
  const textChoice: TextChoice = settings.textScale >= 1.22 ? "extra-large" : settings.textScale >= 1.08 ? "large" : "standard";

  function update(patch: Partial<typeof settings>) {
    setSettings({ ...settings, ...patch, updatedAt: new Date().toISOString() });
  }

  function togglePlainLanguage() {
    update({ plainLanguage: !settings.plainLanguage });
  }

  function setDensity(choice: DensityChoice) {
    if (choice === "standard") update({ reduceDensity: false, focusReadingLayout: false, emphasizeStructure: false });
    if (choice === "reduced") update({ reduceDensity: true, focusReadingLayout: false, emphasizeStructure: true });
    if (choice === "minimal") update({ reduceDensity: true, focusReadingLayout: true, emphasizeStructure: true });
  }

  function setText(choice: TextChoice) {
    const scale = choice === "extra-large" ? 1.25 : choice === "large" ? 1.14 : 1;
    const spacing = choice === "extra-large" ? 1.18 : choice === "large" ? 1.1 : 1;
    update({ textScale: scale, lineSpacing: spacing });
  }

  function tryOneRestorationStep() {
    if (settings.textScale > 1.14) return update({ textScale: 1.14, lineSpacing: Math.min(settings.lineSpacing, 1.1) });
    if (settings.reduceDensity) return update({ reduceDensity: false });
    if (settings.reduceMotion) return update({ reduceMotion: false, stabilizeViewport: false });
    if (settings.softContrast || settings.photophobiaMode) return update({ softContrast: false, photophobiaMode: false });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Adaptive interface"
        title="Focus"
        context="Use temporary supports when they help, then return toward your usual interface at your own pace."
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
              <h2 className="mt-2 text-[25px] font-semibold tracking-tight">Make the current task easier to process.</h2>
              <div data-focus-detailed="true">
                <p className="mt-2 max-w-3xl text-[16px] leading-7 text-[var(--color-text-secondary)]">
                  Focus starts from confirmed symptoms and can reduce visual or cognitive load. Optional on-device MediaPipe signals can later refine the setup when several sustained interaction changes suggest the session may be getting harder.
                </p>
              </div>
              <div className="focus-simplified-only mt-3">
                <ul className="space-y-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">
                  <li>• Simplifies what you need right now.</li>
                  <li>• Keeps important warnings and actions visible.</li>
                  <li>• Camera support is optional.</li>
                </ul>
              </div>
              <div className="mt-5">
                {on ? (
                  <Button variant="secondary" onClick={turnOffFocus}>Turn off & restore original</Button>
                ) : (
                  <Button onClick={() => void startMonitoring()}><Camera />Turn on Focus Mode</Button>
                )}
              </div>
              {!on && <p data-focus-secondary="true" className="mt-2 text-[16px] text-[var(--color-text-tertiary)]">Camera permission is optional; Focus still works with symptom-based and manual supports.</p>}
              {on && error && <p className="mt-3 text-[16px] leading-6 text-[var(--color-text-secondary)]" role="status">{error}</p>}
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
                  <p data-focus-secondary="true" className="mt-3 text-[16px] leading-6 text-[var(--color-text-tertiary)]">Matched from: {startingPlan.reasons.slice(0, 3).join(" · ")}</p>
                )}
              </>
            ) : (
              <p data-focus-secondary="true" className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">No symptom-matched display changes are suggested right now. You can still choose manual supports.</p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Optional reading support</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant={settings.plainLanguage ? "secondary" : "ghost"} onClick={togglePlainLanguage} disabled={!on} aria-pressed={settings.plainLanguage}><Type />{settings.plainLanguage ? "Restore wording" : "Plain language"}</Button>
            <Button size="sm" variant="ghost" onClick={readCurrentPageAloud} disabled={!on}><Volume2 />Read aloud</Button>
          </div>
        </div>
      </Card>

      <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[16px] font-semibold text-[var(--color-text-primary)]"><Settings2 className="h-4 w-4" />Focus settings</summary>
        <div className="mt-4 space-y-5 border-t border-[var(--color-border)] pt-4">
          <SettingGroup label="Content density" description="Reduce optional explanations without hiding safety information.">
            <Segmented choices={["standard", "reduced", "minimal"]} value={density} onChange={(value) => setDensity(value as DensityChoice)} />
          </SettingGroup>
          <SettingGroup label="Reading Spotlight" description="Fades surrounding body text using pointer, keyboard-focus, and viewport position—not eye tracking.">
            <Button size="sm" variant={settings.readingSpotlight ? "secondary" : "ghost"} onClick={() => update({ readingSpotlight: !settings.readingSpotlight })} disabled={!on} aria-pressed={settings.readingSpotlight}><Eye />{settings.readingSpotlight ? "On" : "Off"}</Button>
          </SettingGroup>
          <SettingGroup label="Motion" description="Reduce unnecessary motion while keeping controls usable.">
            <Segmented choices={["standard", "reduced"]} value={settings.reduceMotion ? "reduced" : "standard"} onChange={(value) => update({ reduceMotion: value === "reduced", stabilizeViewport: value === "reduced" })} />
          </SettingGroup>
          <SettingGroup label="Text" description="Changes reading text, not browser zoom.">
            <Segmented choices={["standard", "large", "extra-large"]} value={textChoice} onChange={(value) => setText(value as TextChoice)} />
          </SettingGroup>
          <SettingGroup label="Audio-first assistance" description="Prefers shorter reading surfaces and offers audio; it never starts speaking automatically.">
            <Button size="sm" variant={settings.textToSpeechPreferred ? "secondary" : "ghost"} onClick={() => update({ textToSpeechPreferred: !settings.textToSpeechPreferred })} disabled={!on} aria-pressed={settings.textToSpeechPreferred}>{settings.textToSpeechPreferred ? "On" : "Off"}</Button>
          </SettingGroup>
          <Button size="sm" variant="ghost" onClick={stopReadingAloud}>Stop read aloud</Button>
        </div>
      </details>

      {recentSessionsManageable && on && (settings.reduceDensity || settings.reduceMotion || settings.textScale > 1 || settings.softContrast || settings.photophobiaMode) && (
        <Card className="border-0 bg-[var(--color-positive-soft)] p-5">
          <p className="text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--color-positive)]">Gradual restoration</p>
          <h2 className="mt-1 text-[19px] font-semibold text-[var(--color-text-primary)]">Recent Focus sessions had few difficulty prompts.</h2>
          <p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">Keep your current setup, or try one small step toward the standard interface. Declining is completely fine.</p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={tryOneRestorationStep}>Try one small step</Button>
        </Card>
      )}

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
          Focus uses temporary, symptom-informed supports for light sensitivity, fatigue, reading difficulty, and motion discomfort. Camera-derived patterns are experimental and non-diagnostic; they only help decide whether to offer additional accessibility support.
        </p>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">The goal is accommodation → stabilization → gradual restoration, not permanent avoidance of normal reading, light, motion, or cognitive activity.</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[16px] font-medium text-[var(--color-accent)]">
          <a href="https://bjsm.bmj.com/content/57/11/695" target="_blank" rel="noreferrer" className="hover:underline">Amsterdam concussion consensus</a>
          <a href="https://concussionsontario.org/concussion/guideline-section/fatigue" target="_blank" rel="noreferrer" className="hover:underline">Ontario fatigue and pacing guidance</a>
          <a href="https://pedsconcussion.com/template-for-concussion-teams-letter-to-the-child-adolescents-school/" target="_blank" rel="noreferrer" className="hover:underline">Pediatric school accommodations</a>
        </div>
      </details>

      <Disclaimer variant="block">
        Focus Mode is an experimental accessibility aid. Blink, gaze, facial movement, viewing distance, and interaction patterns are nonspecific and can change because of lighting, dry eyes, stress, glasses, posture, or task difficulty. It does not detect neurological fatigue, diagnose concussion, measure concussion severity, or determine readiness.
      </Disclaimer>
    </div>
  );
}

function SettingGroup({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{label}</p><p data-focus-secondary="true" className="mt-0.5 text-[16px] leading-6 text-[var(--color-text-secondary)]">{description}</p></div>
      <div>{children}</div>
    </div>
  );
}

function Segmented({ choices, value, onChange }: { choices: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group">
      {choices.map((choice) => <Button key={choice} size="sm" variant={value === choice ? "secondary" : "ghost"} onClick={() => onChange(choice)} className="capitalize" aria-pressed={value === choice}>{choice.replace("-", " ")}</Button>)}
    </div>
  );
}
