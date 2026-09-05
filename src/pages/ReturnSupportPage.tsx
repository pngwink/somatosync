import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Pencil,
  Plus,
  Route,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { Disclaimer } from "../components/shared/Disclaimer";
import { useToast } from "../components/shared/Toast";
import { useAppMode } from "../context/AppModeContext";
import { createEmptyPcssRatings, calculatePcssSummary } from "../features/assessments/pcss/pcssData";
import { loadPcssHistory } from "../features/assessments/pcss/pcssStorage";
import type { PcssAssessmentResult } from "../features/assessments/pcss/pcssTypes";
import {
  buildSymptomGuidance,
  recoveryGuidanceSources,
} from "../features/guidance/guidanceEngine";
import {
  coachMessageFor,
  currentStage,
  loadProtocolLogs,
  loadProtocolProgress,
  protocolStages,
  saveProtocolLog,
  saveProtocolProgress,
  type ActivityResponse,
  type ProtocolActivityLog,
  type ProtocolPathway,
  type ProtocolProgress,
} from "../features/protocols/protocolEngine";
import { buildRecoveryEvidenceSummary, type RecoveryEvidenceSummary } from "../features/recovery/evidenceSummary";
import {
  defaultRecoveryProfile,
  loadRecoveryProfile,
  saveRecoveryProfile,
  type AgeGroup,
  type InjuryCause,
  type RecoveryFocus,
  type RecoveryProfile,
  type RecoveryRiskContext,
} from "../features/recovery/recoveryProfile";
import { buildRecoveryOutlook, type RecoveryOutlook } from "../features/outlook/recoveryOutlook";
import { AiRecoveryExplanationPanel } from "../features/recovery/AiRecoveryExplanationPanel";

const pathwayLabels: Record<ProtocolPathway, string> = {
  "daily-life": "Daily life / work",
  learn: "Learning",
  play: "Sport",
};

const focusLabels: Record<RecoveryFocus, string> = {
  school: "School or learning",
  work: "Work",
  "daily-life": "Daily life or caregiving",
  sport: "Sport or high-risk recreation",
};

const riskOptions: Array<{ key: keyof RecoveryRiskContext; label: string }> = [
  { key: "priorConcussions", label: "Prior concussion history" },
  { key: "migraineOrHeadacheHistory", label: "Migraine or headache history" },
  { key: "sleepDifficulty", label: "Sleep difficulty" },
  { key: "mentalHealthHistory", label: "Mental-health history" },
  { key: "neckInjury", label: "Neck pain or neck injury" },
  { key: "highInitialSymptomBurden", label: "High early symptom burden" },
];

export function ReturnSupportPage() {
  const { mode } = useAppMode();
  const { show } = useToast();
  const [version, setVersion] = useState(0);
  const profile = useMemo(() => loadRecoveryProfile(), [version]);
  const latestPcss = useMemo(() => loadPcssHistory()[0] ?? (mode === "demo" ? createDemoPcssResult() : null), [mode, version]);
  const guidance = useMemo(() => buildSymptomGuidance(latestPcss), [latestPcss]);
  const evidence = useMemo(() => mode === "demo" ? createDemoEvidenceSummary() : buildRecoveryEvidenceSummary(), [mode, version]);
  const outlook = useMemo(() => mode === "demo" ? createDemoOutlook() : buildRecoveryOutlook(profile), [mode, profile, version]);

  const defaultPathway: ProtocolPathway = profile.focuses.includes("school") ? "learn" : profile.focuses.includes("sport") ? "play" : "daily-life";
  const [pathway, setPathway] = useState<ProtocolPathway>(defaultPathway);
  const [progress, setProgress] = useState<ProtocolProgress>(() => loadProtocolProgress(defaultPathway));
  const [logs, setLogs] = useState<ProtocolActivityLog[]>(() => loadProtocolLogs().filter((log) => log.pathway === defaultPathway));
  const [stageOpen, setStageOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    setProgress(loadProtocolProgress(pathway));
    setLogs(loadProtocolLogs().filter((log) => log.pathway === pathway));
  }, [pathway]);

  const stage = currentStage(pathway, progress);
  const latestCoach = logs[0] ? coachMessageFor(logs[0]) : null;

  function changeStage(stageId: string) {
    const saved = saveProtocolProgress(pathway, stageId);
    setProgress(saved);
    setStageOpen(false);
    setVersion((value) => value + 1);
    const selected = protocolStages[pathway].find((item) => item.id === saved.currentStageId);
    show({ title: "Current step updated", description: selected?.title, tone: "success" });
  }

  function recordActivity(input: { activityLabel: string; durationMinutes: number; response: ActivityResponse; notes: string }) {
    const log = saveProtocolLog({ pathway, stageId: stage.id, ...input });
    setLogs((current) => [log, ...current]);
    setActivityOpen(false);
    setVersion((value) => value + 1);
    const coach = coachMessageFor(log);
    show({ title: coach.label, description: coach.nextAction, tone: coach.tone === "risk" ? "error" : "success" });
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Recovery plan"
        title="What are you returning to?"
        context="Choose a pathway. Log what you tried."
        actions={<div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setContextOpen(true)}><Pencil />Context</Button><Button variant="secondary" size="sm" asChild><Link to="/app/recovery?tab=plan"><ArrowLeft />Recovery</Link></Button></div>}
      />

      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Recovery pathway">
        {(Object.keys(pathwayLabels) as ProtocolPathway[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPathway(item)}
            className={`rounded-[16px] border px-4 py-3.5 text-left transition ${pathway === item ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"}`}
          >
            <p className={`text-[16px] font-bold uppercase tracking-[0.12em] ${pathway === item ? "text-[var(--color-accent)]" : "text-[var(--color-text-tertiary)]"}`}>{pathwayLabels[item]}</p>
            <p className="mt-1 text-[16px] font-medium text-[var(--color-text-primary)]">Step {(item === pathway ? currentStage(item, progress) : currentStage(item, loadProtocolProgress(item))).step}</p>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden border-0 bg-[var(--color-accent-soft)] p-0">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-[760px]">
            <p className="text-[16px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">{pathwayLabels[pathway]} · Step {stage.step}</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">{stage.title}</h2>
            <p className="mt-3 line-clamp-2 text-[17px] leading-8 text-[var(--color-text-secondary)]">{stage.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button onClick={() => setActivityOpen(true)}><Plus />Log an activity</Button>
            <Button variant="secondary" onClick={() => setStageOpen(true)}><Route />Change step</Button>
          </div>
        </div>
      </Card>

      {latestCoach && (
        <Card className={`border-0 p-5 sm:p-6 ${latestCoach.tone === "caution" ? "bg-[var(--color-caution-soft)]" : latestCoach.tone === "positive" ? "bg-[var(--color-positive-soft)]" : "bg-[var(--color-info-soft)]"}`}>
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-surface)] text-[var(--color-info)]"><ClipboardCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-[16px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">Latest activity response</p>
              <h3 className="mt-2 text-[19px] font-semibold text-[var(--color-text-primary)]">{latestCoach.label}</h3>
              
              <p className="mt-2 text-[16px] font-semibold leading-7 text-[var(--color-text-primary)]">{latestCoach.nextAction}</p>
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="today-supports" className="space-y-4">
        <div>
          <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-positive)]">Today</p>
          <h2 id="today-supports" className="mt-1 text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)]">Supports worth keeping nearby</h2>
          <p className="mt-1 max-w-3xl text-[16px] leading-7 text-[var(--color-text-secondary)]">Keep the supports that matter today.</p>
        </div>

        {guidance.length === 0 ? (
          <Card className="p-6"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">No symptom-specific support is highlighted yet.</p><p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Complete a check-in to see supports.</p><Button asChild className="mt-4"><Link to="/app/assessments/pcss">Start symptom check-in</Link></Button></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {guidance.slice(0, 3).map((item, index) => (
              <Card key={item.id} className={`border-0 p-5 sm:p-6 ${index % 2 === 0 ? "bg-[var(--color-positive-soft)]" : "bg-[var(--color-info-soft)]"}`}>
                <div className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 shrink-0 text-[var(--color-accent)]" /><div><h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">{item.title}</h3><p className="mt-2 line-clamp-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{item.suggestions[0]}</p></div></div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {logs.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[16px] font-bold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">Recent activity</p><h2 className="mt-1 text-[20px] font-semibold text-[var(--color-text-primary)]">What you tried</h2></div><Button variant="ghost" size="sm" onClick={() => setActivityOpen(true)}>Log another</Button></div>
          <div className="mt-4 divide-y divide-[var(--color-border)]">
            {logs.slice(0, 3).map((log) => <ActivityRow key={log.id} log={log} />)}
          </div>
        </Card>
      )}

      <details className="group rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1">
          <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">More recovery detail</p><p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">Sources and deeper guidance</p></div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-accent)] transition group-open:rotate-90" />
        </summary>
        <div className="mt-5 space-y-5 border-t border-[var(--color-border)] pt-5">
          <Card className="border-0 bg-[var(--color-info-soft)] p-5">
            <Badge tone={outlook.summaryTone} showDot>{outlook.phaseLabel}</Badge>
            <h3 className="mt-3 text-[18px] font-semibold text-[var(--color-text-primary)]">{outlook.summary}</h3>
            <p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{outlook.noDateReason}</p>
            <p className="mt-3 text-[16px] font-medium text-[var(--color-text-tertiary)]">Data coverage: {outlook.dataCoverage}</p>
          </Card>

          <AiRecoveryExplanationPanel evidence={evidence} outlook={outlook} guidance={guidance} />

          <div className="rounded-[16px] bg-[var(--color-surface-sunken)] p-5">
            <div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" /><div><h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Scientific basis</h3><p className="mt-1 text-[16px] leading-7 text-[var(--color-text-secondary)]">SomatoSync uses gradual, symptom-limited return concepts and keeps school, daily life, and sport pathways separate. It does not generate clearance or a personal recovery date.</p></div></div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[16px] font-medium text-[var(--color-accent)]">
              {recoveryGuidanceSources.slice(0, 3).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{source.publisher}<ExternalLink className="h-3 w-3" /></a>)}
            </div>
          </div>
        </div>
      </details>

      <Disclaimer variant="block">This plan supports tracking and care-team conversations. It does not automatically advance recovery stages, grant clearance, or replace individualized medical guidance.</Disclaimer>

      <StageDialog open={stageOpen} onOpenChange={setStageOpen} pathway={pathway} currentStageId={stage.id} onSelect={changeStage} />
      <ActivityDialog open={activityOpen} onOpenChange={setActivityOpen} stageTitle={stage.title} onSave={recordActivity} />
      <RecoveryContextDialog key={version} open={contextOpen} onOpenChange={setContextOpen} profile={profile} isDemo={mode === "demo"} onSaved={() => { setVersion((value) => value + 1); setContextOpen(false); }} />
    </div>
  );
}

function ActivityRow({ log }: { log: ProtocolActivityLog }) {
  const message = coachMessageFor(log);
  return (
    <div className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{log.activityLabel}</p><p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">{log.durationMinutes} min · {new Date(log.completedAt).toLocaleDateString()}</p>{log.notes && <p className="mt-1 text-[16px] text-[var(--color-text-tertiary)]">{log.notes}</p>}</div>
      <Badge tone={message.tone} showDot>{message.label}</Badge>
    </div>
  );
}

function StageDialog({ open, onOpenChange, pathway, currentStageId, onSelect }: { open: boolean; onOpenChange: (value: boolean) => void; pathway: ProtocolPathway; currentStageId: string; onSelect: (id: string) => void }) {
  const { show } = useToast();
  const [medicalConfirmed, setMedicalConfirmed] = useState(false);

  function choose(id: string) {
    const selected = protocolStages[pathway].find((item) => item.id === id);
    if (!selected) return;
    if (selected.requiresMedicalAuthorization && !medicalConfirmed) {
      show({ title: "Authorization confirmation needed", description: "Confirm care-team authorization before selecting an at-risk sport step.", tone: "error" });
      return;
    }
    onSelect(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-xl overflow-y-auto">
        <DialogTitle>Change current {pathwayLabels[pathway].toLowerCase()} step</DialogTitle>
        <DialogDescription>Choose your current step.</DialogDescription>
        <div className="mt-5 space-y-3">
          {protocolStages[pathway].map((item) => {
            const active = item.id === currentStageId;
            return (
              <button key={item.id} type="button" onClick={() => choose(item.id)} className={`w-full rounded-[16px] border p-4 text-left ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Step {item.step}</p><p className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">{item.title}</p></div>{active && <Badge tone="accent">Current</Badge>}</div>
              </button>
            );
          })}
        </div>
        {pathway === "play" && (
          <label className="mt-4 flex items-start gap-3 rounded-[14px] bg-[var(--color-caution-soft)] p-4 text-[16px] leading-6 text-[var(--color-text-secondary)]"><input type="checkbox" className="mt-1" checked={medicalConfirmed} onChange={(event) => setMedicalConfirmed(event.target.checked)} /><span>I am only selecting an at-risk sport step because the required healthcare professional has authorized that progression.</span></label>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({ open, onOpenChange, stageTitle, onSave }: { open: boolean; onOpenChange: (value: boolean) => void; stageTitle: string; onSave: (input: { activityLabel: string; durationMinutes: number; response: ActivityResponse; notes: string }) => void }) {
  const [activityLabel, setActivityLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [response, setResponse] = useState<ActivityResponse>("tolerated");
  const [notes, setNotes] = useState("");

  function save() {
    if (!activityLabel.trim()) return;
    onSave({ activityLabel, durationMinutes, response, notes });
    setActivityLabel(""); setDurationMinutes(15); setResponse("tolerated"); setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Log an activity</DialogTitle>
        <DialogDescription>Current step: {stageTitle}. Record the activity and how symptoms responded.</DialogDescription>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="activity-name">What did you try?</Label><Input id="activity-name" value={activityLabel} onChange={(event) => setActivityLabel(event.target.value)} placeholder="Example: two classes or a 15-minute walk" /></div>
          <div className="space-y-1.5"><Label htmlFor="activity-duration">Duration</Label><div className="flex items-center gap-2"><Input id="activity-duration" type="number" min={1} max={480} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value) || 1)} /><span className="text-[16px] text-[var(--color-text-secondary)]">minutes</span></div></div>
          <div className="space-y-1.5"><Label>How did symptoms respond?</Label><Select value={response} onValueChange={(value) => setResponse(value as ActivityResponse)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tolerated">No meaningful increase</SelectItem><SelectItem value="mild-brief">Mild and brief increase</SelectItem><SelectItem value="significant-prolonged">Significant or prolonged increase</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="activity-notes">Optional note</Label><Textarea id="activity-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What changed, and how long did it last?" /></div>
          <Button className="w-full" onClick={save} disabled={!activityLabel.trim()}>Save activity</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecoveryContextDialog({ open, onOpenChange, profile, isDemo, onSaved }: { open: boolean; onOpenChange: (value: boolean) => void; profile: RecoveryProfile; isDemo: boolean; onSaved: () => void }) {
  const { show } = useToast();
  const [draft, setDraft] = useState(profile);

  function toggleFocus(focus: RecoveryFocus) {
    setDraft((previous) => ({ ...previous, focuses: previous.focuses.includes(focus) ? previous.focuses.filter((item) => item !== focus) : [...previous.focuses, focus] }));
  }

  function toggleRisk(key: keyof RecoveryRiskContext) {
    setDraft((previous) => ({ ...previous, riskContext: { ...previous.riskContext, [key]: !previous.riskContext[key] } }));
  }

  function save() {
    if (isDemo) { onOpenChange(false); return; }
    saveRecoveryProfile({ injuryDate: draft.injuryDate, ageGroup: draft.ageGroup, injuryCause: draft.injuryCause, focuses: draft.focuses.length ? draft.focuses : defaultRecoveryProfile.focuses, workingWithClinician: draft.workingWithClinician, accessibilityPreference: draft.accessibilityPreference, setupStatus: "completed", riskContext: draft.riskContext });
    show({ title: "Recovery context saved", tone: "success" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto">
        <DialogTitle>Recovery context</DialogTitle>
        <DialogDescription>Optional recovery context.</DialogDescription>
        {isDemo && <div className="mt-4 rounded-[14px] bg-[var(--color-accent-soft)] p-3 text-[16px] text-[var(--color-text-secondary)]">Maya’s demo context is fixed for the sample journey.</div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="recovery-injury-date">Injury date</Label><Input id="recovery-injury-date" type="date" value={draft.injuryDate} disabled={isDemo} onChange={(event) => setDraft((previous) => ({ ...previous, injuryDate: event.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Age group</Label><Select value={draft.ageGroup} disabled={isDemo} onValueChange={(value) => setDraft((previous) => ({ ...previous, ageGroup: value as AgeGroup }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="child-teen">Child or teen</SelectItem><SelectItem value="adult">Adult</SelectItem><SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>How the injury happened</Label><Select value={draft.injuryCause} disabled={isDemo} onValueChange={(value) => setDraft((previous) => ({ ...previous, injuryCause: value as InjuryCause }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fall">Fall</SelectItem><SelectItem value="vehicle">Vehicle crash</SelectItem><SelectItem value="workplace">Workplace incident</SelectItem><SelectItem value="sport">Sport</SelectItem><SelectItem value="recreation">Non-sport recreation</SelectItem><SelectItem value="assault">Assault</SelectItem><SelectItem value="other">Other</SelectItem><SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem></SelectContent></Select></div>
        </div>
        <div className="mt-6 border-t border-[var(--color-border)] pt-5"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">What are you returning to?</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{(Object.keys(focusLabels) as RecoveryFocus[]).map((focus) => <label key={focus} className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] p-3 text-[16px] text-[var(--color-text-secondary)]"><input type="checkbox" checked={draft.focuses.includes(focus)} disabled={isDemo} onChange={() => toggleFocus(focus)} /><span>{focusLabels[focus]}</span></label>)}</div></div>
        <details className="mt-5 rounded-[14px] border border-[var(--color-border)] px-4 py-3"><summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Optional recovery-risk context</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{riskOptions.map((option) => <label key={option.key} className="flex items-start gap-2 text-[16px] text-[var(--color-text-secondary)]"><input type="checkbox" className="mt-1" checked={draft.riskContext[option.key]} disabled={isDemo} onChange={() => toggleRisk(option.key)} /><span>{option.label}</span></label>)}</div></details>
        <Button className="mt-5 w-full" onClick={save}>{isDemo ? "Close demo context" : "Save context"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function createDemoPcssResult(): PcssAssessmentResult {
  const ratings = createEmptyPcssRatings();
  ratings.headache = 2;
  ratings.fatigue = 3;
  ratings.sensitivityToLight = 3;
  ratings.difficultyConcentrating = 2;
  ratings.memoryProblems = 1;
  ratings.dizziness = 1;
  ratings.troubleFallingAsleep = 1;
  return { id: "demo-pcss-guidance", assessmentType: "symptom-check-in", completedAt: "2026-07-28T07:00:00.000Z", ratings, ...calculatePcssSummary(ratings), isDemo: true };
}

function createDemoEvidenceSummary(): RecoveryEvidenceSummary {
  return {
    overallLabel: "Several domains are improving",
    overallDetail: "Maya’s sample symptoms, reaction time, delayed recall, and camera-measured movement improved across repeated entries. Each domain remains visible and none grants clearance.",
    overallTone: "positive",
    improvingCount: 4,
    worseningCount: 0,
    measuredCount: 4,
    generatedAt: "2026-07-28T07:00:00.000Z",
    domains: [
      { id: "symptoms", label: "Reported symptoms", direction: "improving", headline: "Symptom burden is trending lower", detail: "PCSS severity changed from 62 to 18 across Maya’s sample entries.", tone: "positive", sampleCount: 5 },
      { id: "reaction", label: "Reaction time", direction: "improving", headline: "Reaction time is faster than the starting session", detail: "Median reaction time changed from 402 ms to 299 ms across sample sessions.", tone: "positive", sampleCount: 5 },
      { id: "memory", label: "Learning & recall", direction: "improving", headline: "Delayed recall increased", detail: "Delayed recall changed from 4 to 7 of 10 words across sample sessions.", tone: "positive", sampleCount: 3 },
      { id: "balance", label: "Camera balance", direction: "improving", headline: "Recorded lateral movement decreased", detail: "Lateral movement changed from 1.46% to 0.82% of frame width under comparable demo conditions.", tone: "positive", sampleCount: 3 },
    ],
  };
}

function createDemoOutlook(): RecoveryOutlook {
  return {
    phaseLabel: "Follow-up window",
    daysPostInjury: 14,
    summary: "The sample record shows improvement with some ongoing activity-sensitive symptoms.",
    summaryTone: "info",
    signals: [],
    dataCoverage: "4 measured domains",
    noDateReason: "Recovery varies by person and domain, so SomatoSync does not generate an exact recovery date.",
    generatedAt: "2026-07-28T07:00:00.000Z",
  };
}
