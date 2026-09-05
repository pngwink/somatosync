import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCog,
  CalendarDays,
  ChevronRight,
  FileText,
  MessagesSquare,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { currentPatient } from "../data/patient";
import { useAppMode } from "../context/AppModeContext";
import { buildRecoveryEvidenceSummary } from "../features/recovery/evidenceSummary";
import { getMostRecentPcssResult } from "../features/assessments/pcss/pcssStorage";

export function OverviewPage() {
  const { mode, userName } = useAppMode();
  const evidence = buildRecoveryEvidenceSummary();
  const latestPcss = getMostRecentPcssResult();
  const isDemo = mode === "demo";
  const firstName = isDemo ? currentPatient.name.split(" ")[0] : userName.split(" ")[0];
  const hasData = isDemo || evidence.measuredCount > 0;
  const today = new Date();



  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow={today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={`Hi, ${firstName}`}
        context={isDemo ? "Sample recovery journey." : "One useful action at a time."}
      />

      <Card className="border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] p-7 sm:p-9">
        <p className="text-[16px] font-semibold text-[var(--color-accent)]">Today</p>
        <h2 className="mt-2 max-w-2xl text-balance text-[27px] font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[32px]">
          {latestPcss || isDemo ? "How are you feeling today?" : "Start your recovery record"}
        </h2>
        <p className="mt-3 max-w-[64ch] text-[16px] leading-7 text-[var(--color-text-secondary)]">
          {latestPcss || isDemo
            ? "Tell SomatoSync what changed today."
            : "Start with a short symptom check-in."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/app/assessments/voice-check-in"><Mic />Talk through check-in<ArrowRight /></Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/app/check-in?tab=schedule"><CalendarDays />See this week</Link>
          </Button>
        </div>
      </Card>

      {hasData && (
        <section aria-labelledby="recovery-overview-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="recovery-overview-heading" className="text-[20px] font-semibold text-[var(--color-text-primary)]">Current recovery</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/app/recovery">Open recovery <ChevronRight /></Link></Button>
          </div>
          <Card className="p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-[68ch]">
                <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--color-accent)]" /><p className="text-[18px] font-semibold text-[var(--color-text-primary)]">{isDemo ? "Several areas are improving" : evidence.overallLabel}</p></div>
                <p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">
                  {isDemo
                    ? "Several areas are improving. Light sensitivity and fatigue still show up during longer screen sessions."
                    : evidence.overallDetail}
                </p>
              </div>
              <Badge tone={isDemo ? "positive" : evidence.overallTone} showDot>{isDemo ? "Improving pattern" : `${evidence.measuredCount} areas tracked`}</Badge>
            </div>
          </Card>
        </section>
      )}

      <section aria-labelledby="continue-heading">
        <h2 id="continue-heading" className="mb-3 text-[20px] font-semibold text-[var(--color-text-primary)]">Continue</h2>
        <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
          <ActionRow icon={BrainCog} title="Focus" detail="Adaptive interface support" href="/app/neuro-adaptive" />
          <ActionRow icon={MessagesSquare} title="Assistant" detail="Evidence-backed answers" href="/app/research" />
          <ActionRow icon={FileText} title="Reports" detail="Shareable recovery summary" href="/app/reports" />
        </Card>
      </section>


      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5 text-[16px] text-[var(--color-text-secondary)]">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--color-positive)]" />Private by default. You choose what to share.</span>
        <Link to="/app/privacy" className="font-semibold text-[var(--color-accent)] hover:underline">Privacy details</Link>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, title, detail, href }: { icon: typeof BrainCog; title: string; detail: string; href: string }) {
  return (
    <Link to={href} className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-[var(--color-surface-sunken)] sm:px-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-0.5 text-[16px] leading-6 text-[var(--color-text-secondary)]">{detail}</p></div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
