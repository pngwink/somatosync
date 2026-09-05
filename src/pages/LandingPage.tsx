import { Link, useNavigate } from "react-router-dom";
import { Wordmark } from "../components/navigation/Wordmark";
import { Button } from "../components/ui/button";
import { Disclaimer } from "../components/shared/Disclaimer";
import { useAppMode } from "../context/AppModeContext";
import {
  ArrowRight,
  BrainCircuit,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  Database,
  LockKeyhole,
  Mic,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

export function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useAppMode();

  function openDemo() {
    enterDemo();
    navigate("/app");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/92 px-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-2 sm:gap-4 text-[14.5px]">
            <button type="button" onClick={openDemo} className="hidden font-semibold text-[var(--color-accent)] hover:underline sm:block">Maya demo</button>
            <Link to="/sign-in" className="font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">Sign in</Link>
            <Button size="sm" asChild><Link to="/create-account">Create account</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-4 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[1fr_420px]">
            <div>
              <Badge tone="accent">Privacy-first concussion recovery</Badge>
              <h1 className="mt-5 max-w-3xl text-balance text-[38px] font-semibold leading-[1.07] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[51px]">
                Recovery tracking that feels clear, not clinical.
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                Speak or record symptoms, complete short cognitive and camera-based tasks, understand changes, and use an interface that can adapt its visual load—without reducing recovery to one score.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={openDemo}>Open Maya Chen demo <ArrowRight className="h-4 w-4" /></Button>
                <Button size="lg" variant="secondary" asChild><Link to="/create-account">Create a blank account</Link></Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14.5px] text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--color-positive)]" /> Sport and non-sport injuries</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--color-positive)]" /> No sign-in for demo</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--color-positive)]" /> Camera processing stays local</span>
              </div>
            </div>
            <PhonePreview />
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-12 sm:px-8">
          <div className="mx-auto max-w-[1120px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[14px] font-semibold text-[var(--color-accent)]">How it works</p><h2 className="mt-2 text-[27px] font-semibold tracking-tight text-[var(--color-text-primary)]">One recovery journey, three simple steps</h2></div>
              <TechnologyEvidenceDialog />
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <HowStep icon={ClipboardCheck} number="01" title="Check in" detail="Talk through symptoms with private local speech AI or use the standard form, then add only the tasks useful that day." />
              <HowStep icon={Sparkles} number="02" title="Understand" detail="See separate trends and an optional AI explanation grounded in verified data." />
              <HowStep icon={BrainCircuit} number="03" title="Adapt" detail="Site-wide Focus Mode can suggest or automatically apply reversible lower-stimulation changes when sustained session patterns appear." />
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-8">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-positive)]">Private by design</p>
                <h2 className="mt-2 text-[27px] font-semibold tracking-tight text-[var(--color-text-primary)]">Sensitive recovery data stays under the user’s control.</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">The prototype minimizes collection instead of sending every interaction to a server.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PrivacyPoint icon={CameraOff} title="No camera uploads" detail="Frames, pose landmarks, face landmarks, and gaze paths are discarded after local processing." />
                <PrivacyPoint icon={Database} title="Local recovery record" detail="Assessment summaries remain in the browser and can be exported or deleted." />
                <PrivacyPoint icon={BrainCircuit} title="Bounded local AI" detail="On-device models transcribe and explain; transparent rules control medical guidance." />
                <PrivacyPoint icon={LockKeyhole} title="User-controlled access" detail="Focus Mode, microphone transcription, and camera tasks require explicit opt-in and can be stopped at any time." />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-12 sm:px-8">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-5 md:grid-cols-3">
              <FeaturePoint title="Adaptive recovery environment" text="Focus Mode monitors sustained, user-specific session changes and can reversibly reduce motion, contrast, text density, and reading load." />
              <FeaturePoint title="Conversational check-in" text="Talk naturally about the day, review the symptoms and context SomatoSync understood, and correct anything before it is saved." />
              <FeaturePoint title="Recovery evidence that stays connected" text="Symptoms, reaction time, memory, balance, activity tolerance, and adaptive-reading responses remain separate but contribute to one recovery story." />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-8">
          <div className="mx-auto max-w-[1120px]">
            <Disclaimer variant="block" className="max-w-3xl">SomatoSync does not diagnose a concussion, provide medical clearance, or replace evaluation by a licensed healthcare professional.</Disclaimer>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <Wordmark />
          <p className="text-[14.5px] text-[var(--color-text-tertiary)]">© 2026 SomatoSync · Student prototype · Not a medical device</p>
        </div>
      </footer>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_24px_70px_rgba(64,45,52,0.13)]">
      <div className="overflow-hidden rounded-[26px] bg-[var(--color-bg)]">
        <div className="flex items-center justify-between bg-[var(--color-surface)] px-5 py-4"><Wordmark /><ShieldCheck className="h-4 w-4 text-[var(--color-positive)]" /></div>
        <div className="space-y-3 p-4">
          <div className="rounded-[22px] border border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] p-5">
            <p className="text-[14.5px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">Today</p>
            <p className="mt-2 text-[21px] font-semibold text-[var(--color-text-primary)]">How are you feeling?</p>
            <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">A quick symptom update helps organize today’s plan.</p>
            <div className="mt-4 inline-flex rounded-[11px] bg-[var(--color-accent)] px-3 py-2 text-[14.5px] font-semibold text-[var(--color-accent-foreground)]">Start check-in</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PreviewTile icon={Mic} title="Voice Check-In" detail="Private and ready" />
            <PreviewTile icon={BrainCircuit} title="Focus Mode" detail="Ready" />
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-low)]">
            <div className="flex items-center justify-between"><p className="text-[14.5px] font-semibold">Recovery snapshot</p><Badge tone="positive">Improving</Badge></div>
            <div className="mt-4 space-y-3"><PreviewBar label="Symptoms" width="72%" /><PreviewBar label="Reaction" width="62%" /><PreviewBar label="Memory" width="78%" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="rounded-[20px] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-low)]"><Icon className="h-5 w-5 text-[var(--color-accent)]" /><p className="mt-3 text-[14.5px] font-semibold">{title}</p><p className="mt-0.5 text-[14.5px] text-[var(--color-text-tertiary)]">{detail}</p></div>;
}

function PreviewBar({ label, width }: { label: string; width: string }) {
  return <div><div className="flex justify-between text-[14.5px] text-[var(--color-text-secondary)]"><span>{label}</span><span>trend</span></div><div className="mt-1 h-1.5 rounded-full bg-[var(--color-surface-sunken)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width }} /></div></div>;
}

function PrivacyPoint({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-low)]"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-positive-soft)] text-[var(--color-positive)]"><Icon className="h-5 w-5" /></span><p className="mt-3 text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-1 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{detail}</p></div>;
}

function HowStep({ icon: Icon, number, title, detail }: { icon: LucideIcon; number: string; title: string; detail: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-low)]"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Icon className="h-5 w-5" /></span><span className="text-[14.5px] font-bold tracking-wider text-[var(--color-text-tertiary)]">{number}</span></div><p className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{detail}</p></div>;
}

function FeaturePoint({ title, text }: { title: string; text: string }) {
  return <div><p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{text}</p></div>;
}

function TechnologyEvidenceDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary" size="sm">Technology, evidence & privacy</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogTitle>How SomatoSync works</DialogTitle>
        <DialogDescription>Technical depth is available without adding another navigation page.</DialogDescription>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailCard title="AI and machine learning" items={["Voice check-ins are transcribed and interpreted on the user’s device.", "Camera-based Focus Mode uses face landmarks to notice sustained interaction changes without identifying the person.", "The balance assessment estimates visible body movement from a short camera recording.", "Recovery explanations are generated from the already-calculated evidence summary rather than raw camera or audio data."]} />
          <DetailCard title="Neuroscience model" items={["Symptoms, cognition, balance, visual activity, and tolerance stay separate.", "The app avoids one readiness score and exact recovery predictions.", "Learning, work/daily life, and sport pathways progress independently."]} />
          <DetailCard title="Privacy architecture" items={["Camera and microphone inference run locally; raw media and landmarks are discarded.", "Voice transcripts are reviewed in memory and are not stored after confirmation.", "Assessment summaries remain local and can be exported or deleted."]} />
          <DetailCard title="Responsible AI" items={["Medical suggestions come from transparent rules.", "Every adaptive alert explains why it appeared.", "No feature diagnoses, clears, or predicts a recovery date."]} />
        </div>
        <div className="mt-5 rounded-[16px] bg-[var(--color-surface-sunken)] p-4"><p className="text-[14.5px] font-semibold">Core evidence reviewed</p><div className="mt-2 flex flex-wrap gap-3 text-[14.5px] font-semibold text-[var(--color-accent)]"><a href="https://bjsm.bmj.com/content/57/11/695" target="_blank" rel="noreferrer">Amsterdam consensus</a><a href="https://concussionsontario.org/" target="_blank" rel="noreferrer">Concussions Ontario</a><a href="https://pedsconcussion.com/" target="_blank" rel="noreferrer">PedsConcussion</a></div></div>
      </DialogContent>
    </Dialog>
  );
}

function DetailCard({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-[16px] border border-[var(--color-border)] p-4"><p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">{title}</p><ul className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
