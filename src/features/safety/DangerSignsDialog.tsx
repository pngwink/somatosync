import { useMemo, useState } from "react";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../components/ui/dialog";

const dangerSigns = [
  "A headache that gets worse and does not go away",
  "Repeated vomiting",
  "Seizure or convulsions",
  "Increasing confusion, unusual behavior, restlessness, or agitation",
  "Increasing drowsiness, inability to wake, or inability to stay awake",
  "Slurred speech, weakness, numbness, or decreased coordination",
  "One pupil larger than the other or new double vision",
  "Not recognizing people or places, or a new loss of consciousness",
];

export function DangerSignsDialog({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(dangerSigns.map(() => false));
  const hasDangerSign = useMemo(() => checked.some(Boolean), [checked]);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) setChecked(dangerSigns.map(() => false));
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-risk)_35%,var(--color-border))] px-2.5 py-1.5 text-[14.5px] font-semibold text-[var(--color-risk)] hover:bg-[color-mix(in_srgb,var(--color-risk)_8%,transparent)]"
          aria-label="Check urgent concussion danger signs"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          {!compact && <span className="hidden sm:inline">Urgent signs?</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <div className="flex items-center gap-2 text-[var(--color-risk)]"><TriangleAlert className="h-5 w-5" /><span className="text-[14.5px] font-semibold uppercase tracking-wide">Emergency safety check</span></div>
        <DialogTitle className="mt-2">Are any danger signs happening now?</DialogTitle>
        <DialogDescription>This is separate from the routine symptom score. Select anything that is new or worsening after the injury.</DialogDescription>

        <div className="mt-5 space-y-2">
          {dangerSigns.map((sign, index) => (
            <label key={sign} className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border p-3 ${checked[index] ? "border-[var(--color-risk)] bg-[color-mix(in_srgb,var(--color-risk)_7%,transparent)]" : "border-[var(--color-border)]"}`}>
              <input type="checkbox" checked={checked[index]} onChange={(event) => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} className="mt-0.5 h-4 w-4 accent-[var(--color-risk)]" />
              <span className="text-[14.5px] leading-relaxed text-[var(--color-text-primary)]">{sign}</span>
            </label>
          ))}
        </div>

        {hasDangerSign ? (
          <div className="mt-5 rounded-[var(--radius-md)] border-2 border-[var(--color-risk)] bg-[color-mix(in_srgb,var(--color-risk)_8%,var(--color-surface))] p-4">
            <h3 className="text-[15px] font-semibold text-[var(--color-risk)]">Seek emergency medical care now</h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-primary)]">Call local emergency services (911 in the U.S.) or go to the nearest emergency department. Do not rely on SomatoSync to monitor these symptoms.</p>
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-4">
            <p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">No listed danger sign is selected. Continue monitoring changes and contact a healthcare professional for worsening, concerning, or persistent symptoms.</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><a href="https://www.cdc.gov/heads-up/signs-symptoms/index.html" target="_blank" rel="noreferrer">CDC danger signs<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>
          <Button asChild variant="ghost" size="sm"><a href="https://pedsconcussion.com/domain/recognition/" target="_blank" rel="noreferrer">Pediatric guidance<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
