import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle2, ClipboardCheck, Mic, QrCode, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Wordmark } from "../components/navigation/Wordmark";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Disclaimer } from "../components/shared/Disclaimer";
import { useAppMode } from "../context/AppModeContext";

export function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useAppMode();

  function openDemo() {
    enterDemo();
    navigate("/app");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-3 text-[16px] sm:gap-5">
            <button type="button" onClick={openDemo} className="hidden font-semibold text-[var(--color-accent)] hover:underline sm:block">Try demo</button>
            <Link to="/sign-in" className="font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">Sign in</Link>
            <Button size="sm" asChild><Link to="/create-account">Create account</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-[1fr_390px]">
            <div>
              <h1 className="max-w-3xl text-balance text-[44px] font-bold leading-[1.02] tracking-[-0.045em] text-[var(--color-text-primary)] sm:text-[58px]">
                Recovery that adapts with you.
              </h1>
              <p className="mt-5 max-w-xl text-[19px] leading-8 text-[var(--color-text-secondary)]">
                Check in. Read more comfortably. Share the support you need.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={openDemo}>Try Maya demo <ArrowRight className="h-4 w-4" /></Button>
                <Button size="lg" variant="secondary" asChild><Link to="/create-account">Create account</Link></Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <QuickPill icon={Mic} label="Voice check-in" />
                <QuickPill icon={BrainCircuit} label="Adaptive Focus" />
                <QuickPill icon={QrCode} label="Share supports" />
              </div>
            </div>
            <PhonePreview />
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-14 sm:px-8">
          <div className="mx-auto max-w-[1080px]">
            <h2 className="text-[30px] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Three simple parts</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <SimpleStep icon={ClipboardCheck} title="Check in" text="Tell SomatoSync how today feels." />
              <SimpleStep icon={Sparkles} title="Adapt" text="The screen changes when support is useful." />
              <SimpleStep icon={ShieldCheck} title="Carry it with you" text="Use the same supports on the web or at school." />
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-8">
          <div className="mx-auto max-w-[1080px] rounded-[24px] bg-[var(--color-positive-soft)] p-7 sm:p-9">
            <p className="text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">Private by default</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PrivacyLine text="Camera stays on your device" />
              <PrivacyLine text="You choose what gets shared" />
              <PrivacyLine text="Demo works without sign-in" />
            </div>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-8">
          <div className="mx-auto max-w-[1080px]">
            <Disclaimer variant="block" className="max-w-3xl">SomatoSync supports recovery tracking and accommodations. It does not diagnose or provide medical clearance.</Disclaimer>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <Wordmark />
          <p className="text-[16px] text-[var(--color-text-tertiary)]">Student prototype · Not a medical device</p>
        </div>
      </footer>
    </div>
  );
}

function QuickPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[16px] font-semibold text-[var(--color-text-primary)]">
      <Icon className="h-4 w-4 text-[var(--color-accent)]" />{label}
    </span>
  );
}

function PhonePreview() {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[34px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_24px_70px_rgba(64,45,52,0.12)]">
      <div className="overflow-hidden rounded-[26px] bg-[var(--color-bg)]">
        <div className="flex items-center justify-between bg-[var(--color-surface)] px-5 py-4"><Wordmark /><ShieldCheck className="h-5 w-5 text-[var(--color-positive)]" /></div>
        <div className="space-y-3 p-4">
          <div className="rounded-[22px] bg-[var(--color-accent-soft)] p-5">
            <p className="text-[16px] font-bold text-[var(--color-accent)]">Today</p>
            <p className="mt-2 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">How are you feeling?</p>
            <div className="mt-4 inline-flex rounded-[12px] bg-[var(--color-accent)] px-4 py-2.5 text-[16px] font-bold text-[var(--color-accent-foreground)]">Start check-in</div>
          </div>
          <PreviewRow icon={BrainCircuit} title="Focus Mode" badge="Ready" />
          <PreviewRow icon={Sparkles} title="Recovery" badge="Improving" positive />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ icon: Icon, title, badge, positive = false }: { icon: LucideIcon; title: string; badge: string; positive?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-[var(--color-surface)] p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--color-surface-sunken)] text-[var(--color-accent)]"><Icon className="h-5 w-5" /></span>
      <p className="flex-1 text-[17px] font-semibold text-[var(--color-text-primary)]">{title}</p>
      <Badge tone={positive ? "positive" : "accent"}>{badge}</Badge>
    </div>
  );
}

function SimpleStep({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-5 text-[21px] font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-[16.5px] leading-7 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  );
}

function PrivacyLine({ text }: { text: string }) {
  return <div className="flex items-center gap-2.5 text-[16px] font-semibold text-[var(--color-text-primary)]"><CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-positive)]" />{text}</div>;
}
