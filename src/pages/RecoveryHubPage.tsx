import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  QrCode,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { MetricLineChart } from "../components/charts/MetricLineChart";
import { Disclaimer } from "../components/shared/Disclaimer";
import { NewUserEmptyState } from "../components/shared/NewUserEmptyState";
import { useAppMode } from "../context/AppModeContext";
import { buildRecoveryEvidenceSummary, type RecoveryEvidenceSummary } from "../features/recovery/evidenceSummary";
import { loadPcssHistory } from "../features/assessments/pcss/pcssStorage";
import { loadReactionHistory } from "../features/assessments/reaction/reactionStorage";
import { loadMemoryHistory } from "../features/assessments/memory/memoryStorage";
import { loadBalanceHistory } from "../features/assessments/balance/balanceStorage";
import { buildSymptomGuidance, type SymptomGuidanceItem } from "../features/guidance/guidanceEngine";
import { loadRecoveryProfile } from "../features/recovery/recoveryProfile";
import { buildRecoveryOutlook, type RecoveryOutlook } from "../features/outlook/recoveryOutlook";
import { buildRecoveryStory, buildSupportPatterns } from "../features/recovery-memory/recoveryMemoryEngine";
import type { RecoveryStoryItem, SupportPattern } from "../features/recovery-memory/recoveryMemoryTypes";
import { currentStage, loadProtocolLogs, loadProtocolProgress, type ProtocolPathway } from "../features/protocols/protocolEngine";
import { loadAdaptiveSessions } from "../features/adaptive/neuroAdaptiveStorage";

const tabs = ["summary", "progress", "plan"] as const;
type RecoveryTab = (typeof tabs)[number];

const pathwayNames: Record<ProtocolPathway, string> = {
  learn: "Learning",
  "daily-life": "Work / daily life",
  play: "Sport",
};

const demoPcssSeries = [
  { date: "2026-07-15", value: 62 }, { date: "2026-07-18", value: 50 }, { date: "2026-07-21", value: 39 }, { date: "2026-07-25", value: 26 }, { date: "2026-07-28", value: 18 },
];
const demoReactionSeries = [
  { date: "2026-07-16", value: 402 }, { date: "2026-07-19", value: 368 }, { date: "2026-07-22", value: 341 }, { date: "2026-07-25", value: 318 }, { date: "2026-07-28", value: 299 },
];
const demoMemorySeries = [
  { date: "2026-07-16", value: 4 }, { date: "2026-07-19", value: 5 }, { date: "2026-07-23", value: 7 }, { date: "2026-07-27", value: 7 },
];
const demoBalanceSeries = [
  { date: "2026-07-15", value: 1.46 }, { date: "2026-07-21", value: 1.06 }, { date: "2026-07-26", value: 0.82 },
];

const demoPatterns: SupportPattern[] = [
  { id: "readability", title: "Readability adjustments", detail: "You reported easier reading after this support in 3 of 4 recent follow-ups.", helpfulCount: 3, observedCount: 4 },
  { id: "lower-load", title: "Lower reading load", detail: "You reported easier tolerance after this support in 2 of 3 recent follow-ups.", helpfulCount: 2, observedCount: 3 },
];

const demoStory: RecoveryStoryItem[] = [
  { id: "demo-story-1", completedAt: "2026-07-28T18:20:00.000Z", title: "Reading environment adapted", detail: "Moving closer + squinting → readability adjustments → the later interaction pattern became easier", tone: "positive" },
  { id: "demo-story-2", completedAt: "2026-07-28T17:52:00.000Z", title: "Voice check-in", detail: "Light sensitivity 4/6 · Fatigue 3/6", tone: "neutral" },
  { id: "demo-story-3", completedAt: "2026-07-28T16:40:00.000Z", title: "Memory assessment", detail: "Delayed recall 7/10 · fatigue +1 during task", tone: "neutral" },
];

export function RecoveryHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as RecoveryTab | null;
  const activeTab: RecoveryTab = requestedTab && tabs.includes(requestedTab) ? requestedTab : "summary";
  const { mode } = useAppMode();

  const pcssHistory = loadPcssHistory();
  const reactionHistory = loadReactionHistory().filter((result) => result.medianMs != null);
  const memoryHistory = loadMemoryHistory();
  const balanceHistory = loadBalanceHistory().filter((result) => result.trackingQualityPercent >= 60);
  const latestPcss = pcssHistory[0] ?? null;

  const evidence = useMemo(() => mode === "demo" ? demoEvidence() : buildRecoveryEvidenceSummary(), [mode, pcssHistory.length, reactionHistory.length, memoryHistory.length, balanceHistory.length]);
  const guidance = useMemo(() => mode === "demo" ? demoGuidance() : buildSymptomGuidance(latestPcss), [mode, latestPcss]);
  const outlook = useMemo(() => mode === "demo" ? demoOutlook() : buildRecoveryOutlook(loadRecoveryProfile()), [mode, pcssHistory.length, reactionHistory.length, memoryHistory.length, balanceHistory.length]);
  const patterns = useMemo(() => mode === "demo" ? demoPatterns : buildSupportPatterns(), [mode, evidence.generatedAt]);
  const story = useMemo(() => mode === "demo" ? demoStory : buildRecoveryStory(), [mode, evidence.generatedAt]);

  const pcssSeries = mode === "demo" ? demoPcssSeries : [...pcssHistory].reverse().map((result) => ({ date: result.completedAt.slice(0, 10), value: result.totalSeverity }));
  const reactionSeries = mode === "demo" ? demoReactionSeries : [...reactionHistory].reverse().map((result) => ({ date: result.completedAt.slice(0, 10), value: result.medianMs ?? 0 }));
  const memorySeries = mode === "demo" ? demoMemorySeries : [...memoryHistory].reverse().map((result) => ({ date: result.completedAt.slice(0, 10), value: result.delayedCorrect }));
  const balanceSeries = mode === "demo" ? demoBalanceSeries : [...balanceHistory].reverse().map((result) => ({ date: result.completedAt.slice(0, 10), value: result.lateralRmsPercent }));
  const hasAnyData = evidence.measuredCount > 0;
  const planPathway: ProtocolPathway = loadRecoveryProfile().focuses.includes("school") ? "learn" : loadRecoveryProfile().focuses.includes("sport") ? "play" : "daily-life";
  const planStage = currentStage(planPathway, loadProtocolProgress(planPathway));
  const measuredDomains = evidence.domains.filter((domain) => domain.sampleCount > 0);
  const protocolLogs = mode === "demo" ? [] : loadProtocolLogs();
  const adaptiveSessions = mode === "demo" ? [] : loadAdaptiveSessions();
  const functionSnapshot = mode === "demo"
    ? [
        { label: "Learning", value: "3 classes tolerated", detail: "one planned break" },
        { label: "Reading", value: "20 → 35 min", detail: "longer manageable block" },
        { label: "Walking", value: "10 → 25 min", detail: "gradual activity return" },
        { label: "Focus support", value: "Helpful in 4 sessions", detail: "reduced-density layout" },
      ]
    : [
        { label: "Learning", value: `Step ${currentStage("learn", loadProtocolProgress("learn")).step}`, detail: currentStage("learn", loadProtocolProgress("learn")).title },
        { label: "Daily life / work", value: `Step ${currentStage("daily-life", loadProtocolProgress("daily-life")).step}`, detail: currentStage("daily-life", loadProtocolProgress("daily-life")).title },
        { label: "Physical activity", value: `Step ${currentStage("play", loadProtocolProgress("play")).step}`, detail: currentStage("play", loadProtocolProgress("play")).title },
        { label: "Latest activity", value: protocolLogs[0] ? `${protocolLogs[0].durationMinutes} min` : "Not logged yet", detail: protocolLogs[0]?.activityLabel ?? (adaptiveSessions.length ? `${adaptiveSessions.length} Focus session${adaptiveSessions.length === 1 ? "" : "s"} recorded` : "Log what you successfully resumed") },
      ];

  function changeTab(value: string) {
    const next = value as RecoveryTab;
    setSearchParams(next === "summary" ? {} : { tab: next }, { replace: true });
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Recovery center"
        title="Recovery"
        context="See what changed and what seems to help."
      />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="grid w-full grid-cols-3 rounded-[16px] bg-[var(--color-surface-sunken)] p-1 sm:w-[430px]">
          <TabsTrigger value="summary">Overview</TabsTrigger>
          <TabsTrigger value="progress">Trends</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {!hasAnyData && mode !== "demo" ? (
            <NewUserEmptyState
              title="Complete a check-in to build your recovery overview"
              description="Your recovery highlights."
              primaryHref="/app/check-in"
              primaryLabel="Start check-in"
              secondaryHref="/app/check-in?tab=schedule"
              secondaryLabel="See this week"
            />
          ) : (
            <>
              <section aria-labelledby="function-first" className="space-y-3">
                <div>
                  <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">This week</p>
                  <h2 id="function-first" className="mt-1 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">Function first</h2>
                  <p data-focus-secondary="true" className="mt-1 text-[16px] leading-7 text-[var(--color-text-secondary)]">Progress is shown as what you can tolerate and resume—not a single recovery percentage.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {functionSnapshot.map((item) => (
                    <Card key={item.label} className="p-4">
                      <p className="text-[16px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">{item.label}</p>
                      <p className="mt-2 text-[20px] font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                      <p data-focus-secondary="true" className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{item.detail}</p>
                    </Card>
                  ))}
                </div>
              </section>

              <Card className="overflow-hidden border-0 bg-[var(--color-positive-soft)] p-0">
                <div className="p-6 sm:p-8">
                  <div className="max-w-[720px]">
                    <p className="text-[16px] font-bold uppercase tracking-[0.16em] text-[var(--color-positive)]">Supporting recovery picture</p>
                    <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[36px]">{evidence.overallLabel}</h2>
                    <p className="mt-3 text-[17px] leading-8 text-[var(--color-text-secondary)]">{evidence.overallDetail}</p>
                  </div>
                  </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-0 bg-[var(--color-accent-soft)] p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-surface)] text-[var(--color-accent)]"><Sparkles className="h-5 w-5" /></span>
                    <div>
                      <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">What seems to help</p>
                      <h3 className="mt-2 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">{patterns[0]?.title ?? "Still learning your patterns"}</h3>
                      <p className="mt-2 line-clamp-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{patterns[0]?.detail ?? "SomatoSync will learn this from your sessions."}</p>
                    </div>
                  </div>
                </Card>

                <Card className="border-0 bg-[var(--color-info-soft)] p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-surface)] text-[var(--color-info)]"><BookOpenCheck className="h-5 w-5" /></span>
                    <div>
                      <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-info)]">Latest recovery event</p>
                      <h3 className="mt-2 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">{story[0]?.title ?? "Your story will build here"}</h3>
                      <p className="mt-2 line-clamp-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{story[0]?.detail ?? "Your latest meaningful event will appear here."}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {(evidence.changeAlerts?.length ?? 0) > 0 && (
                <Card className="border-[var(--color-caution)]/30 bg-[var(--color-caution-soft)] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-surface)] text-[var(--color-caution)]"><Activity className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">One result looked different</h3>
                      <p className="mt-1 text-[16px] leading-7 text-[var(--color-text-secondary)]">Repeat it under similar conditions.</p>
                      <p className="mt-3 text-[16px] font-medium text-[var(--color-caution)]">{evidence.changeAlerts?.[0]?.title}</p>
                    </div>
                  </div>
                </Card>
              )}

              <details className="group rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-[16px] font-semibold text-[var(--color-text-primary)]">
                  <span>Recovery story & supporting evidence</span>
                  <span className="text-[16px] font-medium text-[var(--color-accent)] group-open:hidden">Open details</span>
                  <span className="hidden text-[16px] font-medium text-[var(--color-accent)] group-open:inline">Hide details</span>
                </summary>
                <div className="mt-5 grid gap-7 border-t border-[var(--color-border)] pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Recent story</h3>
                    <div className="mt-4 space-y-4">
                      {story.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === "positive" ? "bg-[var(--color-positive)]" : item.tone === "caution" ? "bg-[var(--color-caution)]" : "bg-[var(--color-accent)]"}`} />
                          <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{item.title}</p><p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{item.detail}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Measured areas</h3>
                    <div className="mt-4 space-y-3">
                      {measuredDomains.slice(0, 6).map((domain) => (
                        <div key={domain.id} className="rounded-[14px] bg-[var(--color-surface-sunken)] px-4 py-3">
                          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{domain.label}</p>
                          <p className="mt-0.5 text-[16px] leading-6 text-[var(--color-text-secondary)]">{domain.headline}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {!hasAnyData && mode !== "demo" ? (
            <NewUserEmptyState title="No progress history yet" primaryHref="/app/check-in" primaryLabel="Start check-in" />
          ) : (
            <>
              <Panel title="Functional progress" description="What you are tolerating and resuming matters more than tiny day-to-day symptom changes.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {functionSnapshot.map((item) => <div key={item.label} className="rounded-[14px] bg-[var(--color-surface-sunken)] p-4"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{item.label}</p><p className="mt-1 text-[18px] font-semibold text-[var(--color-accent)]">{item.value}</p><p data-focus-secondary="true" className="mt-1 text-[16px] text-[var(--color-text-secondary)]">{item.detail}</p></div>)}
                </div>
              </Panel>

              {pcssSeries.length > 0 && (
                <Panel title="Symptoms over time" description="Supporting context—not a recovery percentage or clearance measure.">
                  <MetricLineChart data={pcssSeries} unit="of 132" reference={pcssSeries[0].value} referenceLabel="Starting assessment" height={250} />
                </Panel>
              )}

              <div>
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div><p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Other signals</p><h2 className="mt-1 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">Other trends</h2></div>
                  <Button variant="ghost" asChild><Link to="/app/recovery/progress-details">See all trends<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {reactionSeries.length > 0 && <MetricPreview tone="accent" title="Reaction time · experimental" start={`${Math.round(reactionSeries[0].value)} ms`} latest={`${Math.round(reactionSeries.at(-1)?.value ?? 0)} ms`} note="Tracked separately from symptoms" />}
                  {memorySeries.length > 0 && <MetricPreview tone="positive" title="Delayed recall · experimental" start={`${memorySeries[0].value}/10`} latest={`${memorySeries.at(-1)?.value ?? 0}/10`} note="Performance + task tolerance stay separate" />}
                  {balanceSeries.length > 0 && <MetricPreview tone="info" title="Postural movement · experimental" start={`${balanceSeries[0].value.toFixed(2)}%`} latest={`${(balanceSeries.at(-1)?.value ?? 0).toFixed(2)}%`} note="Movement is not treated as a clearance score" />}
                </div>
              </div>

              <div className="flex justify-end"><Button variant="secondary" asChild><Link to="/app/check-in?tab=history">Open individual results</Link></Button></div>
            </>
          )}
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <Card className="border-0 bg-[var(--color-accent-soft)] p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-surface)] text-[var(--color-accent)]"><CheckCircle2 className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Today</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)]">Today’s supports</h2>
                {guidance.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {guidance.slice(0, 2).map((item) => (
                      <div key={item.id} className="rounded-[15px] bg-[var(--color-surface)]/85 px-4 py-3.5">
                        <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{item.suggestions[0]}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-3 text-[16px] text-[var(--color-text-secondary)]">Complete a check-in to see today’s supports.</p>}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <RecoveryActionCard
              tone="info"
              icon={ClipboardList}
              eyebrow="Return plan"
              title="Update return plan"
              description={`Step ${planStage.step}: ${planStage.title}`}
              href="/app/recovery/plan-details"
              action="Open recovery plan"
            />
            <RecoveryActionCard
              tone="positive"
              icon={QrCode}
              eyebrow="Recovery Relay"
              title="Share supports"
              description="Share selected supports by link or QR."
              href="/app/recovery/share"
              action="Share supports"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Disclaimer variant="block">SomatoSync supports tracking and informed conversations. It does not diagnose concussion, grant clearance, or replace individualized care.</Disclaimer>
    </div>
  );
}

function MetricPreview({ tone, title, start, latest, note }: { tone: "accent" | "positive" | "info"; title: string; start: string; latest: string; note: string }) {
  const toneClass = tone === "positive" ? "bg-[var(--color-positive-soft)]" : tone === "info" ? "bg-[var(--color-info-soft)]" : "bg-[var(--color-accent-soft)]";
  return (
    <Card className={`border-0 p-5 ${toneClass}`}>
      <p className="text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{title}</p>
      <div className="mt-4 flex items-end gap-3"><span className="text-[16px] text-[var(--color-text-tertiary)]">{start}</span><ArrowRight className="mb-1 h-4 w-4 text-[var(--color-text-tertiary)]" /><span className="text-[25px] font-semibold tracking-tight text-[var(--color-text-primary)]">{latest}</span></div>
      <p className="mt-3 text-[16px] leading-6 text-[var(--color-text-secondary)]">{note}</p>
    </Card>
  );
}

function RecoveryActionCard({ tone, icon: Icon, eyebrow, title, description, href, action }: { tone: "positive" | "info"; icon: LucideIcon; eyebrow: string; title: string; description: string; href: string; action: string }) {
  const toneClass = tone === "positive" ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]" : "bg-[var(--color-info-soft)] text-[var(--color-info)]";
  return (
    <Card className="group p-6 sm:p-7">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${toneClass}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-5 text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{eyebrow}</p>
      <h3 className="mt-2 text-[24px] font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{description}</p>
      <Button variant="ghost" asChild className="mt-4 px-0 text-[var(--color-accent)]"><Link to={href}>{action}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
    </Card>
  );
}

function demoEvidence(): RecoveryEvidenceSummary {
  return {
    overallLabel: "Function and several tracked domains are changing",
    overallDetail: "The sample user is tolerating more school, reading, and walking while light sensitivity and fatigue still affect longer screen use. Experimental task trends remain supporting context.",
    overallTone: "positive",
    improvingCount: 5,
    worseningCount: 0,
    measuredCount: 6,
    generatedAt: new Date().toISOString(),
    domains: [
      { id: "symptoms", label: "Reported symptoms", direction: "improving", headline: "Symptom burden is trending lower", detail: "PCSS severity changed from 62 to 18 across the demo timeline.", tone: "positive", sampleCount: 7 },
      { id: "reaction", label: "Reaction time · experimental", direction: "improving", headline: "Reaction time is faster", detail: "Median reaction time changed from 402 ms to 299 ms.", tone: "positive", sampleCount: 5 },
      { id: "memory", label: "Learning & recall · experimental", direction: "improving", headline: "Delayed recall increased", detail: "Delayed recall changed from 4 to 7 of 10 words. The latest demo task also records fatigue +1, so performance and task tolerance stay separate.", tone: "positive", sampleCount: 4 },
      { id: "balance", label: "Postural movement · experimental", direction: "improving", headline: "Recorded movement decreased", detail: "Lateral movement changed from 1.46% to 0.82% of frame width. The latest demo task also records dizziness +1, so less movement is not treated as automatic symptom improvement.", tone: "positive", sampleCount: 5 },
      { id: "activity", label: "Activity tolerance", direction: "similar", headline: "Most recent activities were tolerated with pacing", detail: "The sample record includes one tolerated aerobic session and one mild, brief school-related symptom increase.", tone: "info", sampleCount: 2 },
      { id: "focus", label: "Focus interaction patterns · experimental", direction: "improving", headline: "Fewer interaction-difficulty prompts were confirmed", detail: "The sample user reported that reduced density and planned breaks made several sessions easier. This is an association, not evidence that the setting treated concussion.", tone: "positive", sampleCount: 4 },
    ],
  };
}

function demoGuidance(): SymptomGuidanceItem[] {
  return [
    {
      id: "demo-light",
      title: "Light sensitivity support",
      trigger: "Light sensitivity remains elevated",
      tone: "caution",
      suggestions: ["Use shorter screen sessions, reduce visual clutter, and consider text-to-speech when reading becomes uncomfortable."],
      sourceIds: ["ontario-return", "peds-guideline"],
    },
    {
      id: "demo-fatigue",
      title: "Cognitive pacing",
      trigger: "Fatigue and concentration symptoms remain present",
      tone: "info",
      suggestions: ["Break demanding schoolwork into shorter blocks with planned low-stimulation pauses."],
      sourceIds: ["amsterdam-2022", "ontario-return"],
    },
  ];
}

function demoOutlook(): RecoveryOutlook {
  return {
    phaseLabel: "Follow-up window",
    daysPostInjury: 14,
    summary: "The demo shows improvement with some ongoing activity-sensitive symptoms.",
    summaryTone: "info",
    signals: [
      { id: "demo-fatigue-signal", title: "Fatigue still affects activity tolerance", detail: "Maya’s sample record shows improvement overall, while longer screen and school sessions still need pacing.", tone: "caution", sourceIds: [] },
    ],
    dataCoverage: "4 measured domains",
    noDateReason: "Recovery varies by person and domain, so the app does not generate an exact recovery date.",
    generatedAt: new Date().toISOString(),
  };
}
