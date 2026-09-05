import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { useAppMode } from "../../context/AppModeContext";
import { CONTEXT_OPTIONS, buildRecoveryStory, buildSupportPatterns } from "./recoveryMemoryEngine";
import { saveRecoveryMemoryEvent } from "./recoveryMemoryStorage";
import type { RecoveryStoryItem, SupportPattern } from "./recoveryMemoryTypes";

const demoPatterns: SupportPattern[] = [
  { id: "readability", title: "Readability adjustments", detail: "3 of 4 recent follow-ups or support reports were followed by better tolerance.", helpfulCount: 3, observedCount: 4 },
  { id: "lower-load", title: "Lower reading load", detail: "2 of 3 recent follow-ups or support reports were followed by better tolerance.", helpfulCount: 2, observedCount: 3 },
];

const demoStory: RecoveryStoryItem[] = [
  { id: "demo-1", completedAt: "2026-07-28T18:20:00.000Z", title: "Reading environment adapted", detail: "Moving closer + squinting → readability adjustments → observed strain settled afterward", contexts: ["School or homework", "Screens or reading"], tone: "positive" },
  { id: "demo-2", completedAt: "2026-07-28T17:52:00.000Z", title: "Voice check-in", detail: "Light sensitivity 4/6 · Fatigue 3/6", contexts: ["School or homework"], tone: "neutral" },
  { id: "demo-3", completedAt: "2026-07-28T16:40:00.000Z", title: "Memory assessment", detail: "Delayed recall: 7 of 10 · Task tolerance: fatigue +1, headache unchanged.", tone: "neutral" },
  { id: "demo-4", completedAt: "2026-07-28T09:00:00.000Z", title: "Reaction assessment", detail: "Median reaction time: 299 ms.", tone: "neutral" },
  { id: "demo-5", completedAt: "2026-07-27T17:35:00.000Z", title: "Support feedback", detail: "Teacher / school reported 2 of 2 provided supports seemed helpful.", tone: "positive" },
  { id: "demo-6", completedAt: "2026-07-26T16:10:00.000Z", title: "Postural-movement assessment", detail: "Recorded movement: 0.82% of frame width · Task tolerance: dizziness +1, headache unchanged.", tone: "neutral" },
];

export function RecoveryMemoryPanel() {
  const { mode } = useAppMode();
  const [revision, setRevision] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const patterns = useMemo(() => mode === "demo" ? demoPatterns : buildSupportPatterns(), [mode, revision]);
  const story = useMemo(() => mode === "demo" ? demoStory : buildRecoveryStory(), [mode, revision]);
  const visibleStory = showFullStory ? story : story.slice(0, 3);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("somatosync-recovery-memory-updated", refresh);
    return () => window.removeEventListener("somatosync-recovery-memory-updated", refresh);
  }, []);

  function toggleContext(value: string) {
    setSelectedContexts((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length >= 3 ? current : [...current, value]);
  }

  function saveContext() {
    if (selectedContexts.length === 0) return;
    saveRecoveryMemoryEvent({ id: `context_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, kind: "context-note", completedAt: new Date().toISOString(), contexts: selectedContexts, note: note.trim().slice(0, 140) || undefined });
    setSelectedContexts([]); setNote(""); setDialogOpen(false); setRevision((value) => value + 1);
  }

  return (
    <Card className="p-6 sm:p-7">
      <section aria-labelledby="help-patterns-heading">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-positive-soft)] text-[var(--color-positive)]"><Sparkles className="h-5 w-5" /></span>
          <div><h2 id="help-patterns-heading" className="text-[20px] font-semibold text-[var(--color-text-primary)]">What seems to help</h2><p className="mt-1 max-w-[62ch] text-[15.5px] leading-7 text-[var(--color-text-secondary)]">Repeated links between a support and better tolerance appear here.</p></div>
        </div>

        {patterns.length > 0 ? (
          <div className="mt-5 divide-y divide-[var(--color-border)] rounded-[16px] bg-[var(--color-surface-sunken)] px-4 sm:px-5">
            {patterns.slice(0, 3).map((pattern) => (
              <div key={pattern.id} className="flex items-start gap-3 py-4">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--color-positive)]" />
                <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{pattern.title}</p><p className="mt-1 text-[15px] leading-6 text-[var(--color-text-secondary)]">{pattern.detail}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[16px] bg-[var(--color-surface-sunken)] p-5"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Still learning your response patterns</p><p className="mt-1 text-[15px] leading-6 text-[var(--color-text-secondary)]">Adaptive-reading follow-ups and shared-support feedback can gradually build this view.</p></div>
        )}
        <p className="mt-3 text-[14px] leading-6 text-[var(--color-text-tertiary)]">Observed associations only—not proof that a support caused medical improvement.</p>
      </section>

      <section aria-labelledby="recovery-story-heading" className="mt-7 border-t border-[var(--color-border)] pt-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><BookOpenCheck className="h-5 w-5" /></span>
            <div><h2 id="recovery-story-heading" className="text-[20px] font-semibold text-[var(--color-text-primary)]">Recent recovery story</h2><p className="mt-1 max-w-[62ch] text-[15.5px] leading-7 text-[var(--color-text-secondary)]">A short sequence of what happened, what support was used, and what followed.</p></div>
          </div>
          {mode !== "demo" && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button variant="secondary" size="sm"><Plus />Add context</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogTitle>Add context</DialogTitle><DialogDescription>Add only what matters for understanding the activity or environment.</DialogDescription><div className="mt-5 grid gap-2 sm:grid-cols-2">{CONTEXT_OPTIONS.map((context) => { const active = selectedContexts.includes(context); return <button key={context} type="button" onClick={() => toggleContext(context)} className={`rounded-[14px] border px-3 py-3 text-left text-[15px] font-medium transition ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"}`}>{context}</button>; })}</div><Textarea className="mt-4" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note, e.g. 40 minutes of math homework" maxLength={140} /><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveContext} disabled={selectedContexts.length === 0}>Save context</Button></div></DialogContent></Dialog>}
        </div>

        {story.length > 0 ? (
          <div className="mt-5">
            <div>{visibleStory.map((item, index) => <div key={item.id} className="relative flex gap-4 pb-5 last:pb-0">{index < visibleStory.length - 1 && <span className="absolute left-[5px] top-5 h-[calc(100%-8px)] w-px bg-[var(--color-border)]" />}<span className={`relative mt-2 h-3 w-3 shrink-0 rounded-full ${item.tone === "positive" ? "bg-[var(--color-positive)]" : item.tone === "caution" ? "bg-[var(--color-caution)]" : "bg-[var(--color-accent)]"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{item.title}</p><time className="text-[14px] text-[var(--color-text-tertiary)]">{formatTime(item.completedAt)}</time></div><p className="mt-1 text-[15px] leading-6 text-[var(--color-text-secondary)]">{item.detail}</p>{(item.contexts?.length ?? 0) > 0 && <p className="mt-1.5 text-[14px] font-medium text-[var(--color-accent)]">{item.contexts?.slice(0, 2).join(" · ")}</p>}</div></div>)}</div>
            {story.length > 3 && <Button variant="ghost" size="sm" className="mt-4 px-0 text-[var(--color-accent)]" onClick={() => setShowFullStory((value) => !value)}>{showFullStory ? "Show recent only" : "See full story"}<ChevronDown className={`h-4 w-4 transition ${showFullStory ? "rotate-180" : ""}`} /></Button>}
          </div>
        ) : (
          <div className="mt-5 rounded-[16px] bg-[var(--color-surface-sunken)] p-5"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Your recovery story will build automatically</p><p className="mt-1 text-[15px] leading-6 text-[var(--color-text-secondary)]">Check-ins, assessments, adaptive reading, shared-support feedback, and context you choose to add will appear here.</p></div>
        )}
      </section>
    </Card>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso); const now = new Date(); const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }).format(date);
}
