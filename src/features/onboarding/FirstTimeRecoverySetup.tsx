import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { useAppMode } from "../../context/AppModeContext";
import { useUserPreferences } from "../../context/UserPreferencesContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  defaultRecoveryProfile,
  loadRecoveryProfile,
  markRecoverySetupSkipped,
  saveRecoveryProfile,
  type AccessibilityPreference,
  type AgeGroup,
  type InjuryCause,
  type RecoveryFocus,
} from "../recovery/recoveryProfile";

const focusOptions: Array<{ value: RecoveryFocus; label: string }> = [
  { value: "school", label: "School / learning" },
  { value: "work", label: "Work" },
  { value: "daily-life", label: "Daily life / caregiving" },
  { value: "sport", label: "Sport / high-risk recreation" },
];

export function FirstTimeRecoverySetup() {
  const { mode } = useAppMode();
  const { setReducedVisualIntensity } = useUserPreferences();
  const initial = useMemo(() => loadRecoveryProfile(), [mode]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [injuryDate, setInjuryDate] = useState(initial.injuryDate);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initial.ageGroup);
  const [injuryCause, setInjuryCause] = useState<InjuryCause>(initial.injuryCause);
  const [focuses, setFocuses] = useState<RecoveryFocus[]>(initial.focuses);
  const [workingWithClinician, setWorkingWithClinician] = useState<boolean | null>(initial.workingWithClinician);
  const [accessibility, setAccessibility] = useState<AccessibilityPreference>(initial.accessibilityPreference);

  useEffect(() => {
    if (mode === "user" && loadRecoveryProfile().setupStatus === "not-started") setOpen(true);
  }, [mode]);

  function toggleFocus(value: RecoveryFocus) {
    setFocuses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function skip() {
    markRecoverySetupSkipped();
    setOpen(false);
  }

  function finish() {
    saveRecoveryProfile({
      injuryDate,
      ageGroup,
      injuryCause,
      focuses: focuses.length ? focuses : ["daily-life"],
      workingWithClinician,
      accessibilityPreference: accessibility,
      setupStatus: "completed",
      riskContext: defaultRecoveryProfile.riskContext,
    });
    setReducedVisualIntensity(accessibility === "reduced-stimulation" || accessibility === "audio-first");
    setOpen(false);
  }

  if (mode !== "user") return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) skip(); else setOpen(true); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <CalendarDays className="h-5 w-5" />
          <span className="text-[14.5px] font-semibold uppercase tracking-wide">60-second setup</span>
        </div>
        <DialogTitle className="mt-2">Personalize the recovery journey</DialogTitle>
        <DialogDescription>Only the details that change what SomatoSync shows. Everything is optional and stored locally.</DialogDescription>

        <div className="mt-5 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`} />)}
        </div>

        {step === 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="setup-injury-date">Approximate injury date</Label><Input id="setup-injury-date" type="date" value={injuryDate} onChange={(event) => setInjuryDate(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Age group</Label><Select value={ageGroup} onValueChange={(value) => setAgeGroup(value as AgeGroup)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="child-teen">Child / teen</SelectItem><SelectItem value="adult">Adult</SelectItem><SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Injury context</Label><Select value={injuryCause} onValueChange={(value) => setInjuryCause(value as InjuryCause)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fall">Fall</SelectItem><SelectItem value="vehicle">Vehicle crash</SelectItem><SelectItem value="workplace">Workplace incident</SelectItem><SelectItem value="sport">Sport</SelectItem><SelectItem value="recreation">Recreation</SelectItem><SelectItem value="assault">Assault</SelectItem><SelectItem value="other">Other</SelectItem><SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem></SelectContent></Select></div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-5">
            <div><Label>Main return goals</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">{focusOptions.map((option) => <button key={option.value} type="button" onClick={() => toggleFocus(option.value)} className={`flex items-center justify-between rounded-[var(--radius-sm)] border px-3 py-3 text-left text-[14px] ${focuses.includes(option.value) ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-text-primary)]"}`}><span>{option.label}</span>{focuses.includes(option.value) && <Check className="h-4 w-4" />}</button>)}</div></div>
            <div><Label>Working with a healthcare professional?</Label><div className="mt-2 flex gap-2">{[{ value: true, label: "Yes" }, { value: false, label: "Not currently" }].map((option) => <button key={String(option.value)} type="button" onClick={() => setWorkingWithClinician(option.value)} className={`rounded-[var(--radius-sm)] border px-4 py-2 text-[14px] ${workingWithClinician === option.value ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-text-primary)]"}`}>{option.label}</button>)}</div></div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-3">
            <Label>Preferred starting interface</Label>
            {([
              ["standard", "Standard", "Normal text, motion, and contrast."],
              ["reduced-stimulation", "Reduced stimulation", "Softer contrast, less motion, and easier reading density."],
              ["audio-first", "Audio first", "Reduced stimulation with text-to-speech suggested for longer content."],
            ] as Array<[AccessibilityPreference, string, string]>).map(([value, title, detail]) => (
              <button key={value} type="button" onClick={() => setAccessibility(value)} className={`w-full rounded-[var(--radius-md)] border p-3 text-left ${accessibility === value ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)]"}`}>
                <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{detail}</p>
              </button>
            ))}
            <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-positive)]" /><p className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">These choices personalize navigation and accessibility only. They do not diagnose, predict recovery, or set medical restrictions.</p></div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <Button variant="ghost" onClick={step === 0 ? skip : () => setStep((value) => value - 1)}>{step === 0 ? "Skip for now" : "Back"}</Button>
          {step < 2 ? <Button onClick={() => setStep((value) => value + 1)}>Continue<ChevronRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={finish}>Finish setup</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
