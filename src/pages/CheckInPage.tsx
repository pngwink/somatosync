import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Brain,
  Camera,
  CheckCircle2,
  ChevronRight,
  Play,
  Route,
  Sparkles,
  Mic,
  Zap,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AssessmentRunnerDialog } from "../components/assessments/AssessmentRunnerDialog";
import { Disclaimer } from "../components/shared/Disclaimer";
import { assessmentDefinitions, getMostRecentResult } from "../data/assessments";
import { getReactionDashboardRow } from "../features/assessments/reaction/reactionStorage";
import { getPcssDashboardRow, getMostRecentPcssResult } from "../features/assessments/pcss/pcssStorage";
import { getBalanceDashboardRow } from "../features/assessments/balance/balanceStorage";
import { getMemoryDashboardRow } from "../features/assessments/memory/memoryStorage";
import { buildSymptomGuidance } from "../features/guidance/guidanceEngine";
import { interpretAssessmentResult } from "../features/assessments/shared/resultInterpretation";
import { buildTwoWeekSchedule, toLocalDateKey } from "../features/schedule/scheduleEngine";
import { useAppMode } from "../context/AppModeContext";
import { useToast } from "../components/shared/Toast";
import type { AssessmentDefinition, AssessmentResult } from "../types";
import { WeeklyScheduleView } from "../features/schedule/WeeklyScheduleView";

const tabs = ["today", "history", "schedule"] as const;
type CheckInTab = (typeof tabs)[number];

const assessmentIcons: Record<AssessmentDefinition["id"], typeof Activity> = {
  "symptom-check-in": Activity,
  "reaction-time": Zap,
  memory: Brain,
  balance: Camera,
};

export function CheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as CheckInTab | null;
  const activeTab: CheckInTab = requestedTab && tabs.includes(requestedTab) ? requestedTab : "today";
  const { mode } = useAppMode();
  const navigate = useNavigate();
  const { show } = useToast();
  const [activeRunner, setActiveRunner] = useState<AssessmentDefinition | null>(null);

  const latestPcss = getMostRecentPcssResult();
  const guidance = buildSymptomGuidance(latestPcss);
  const days = buildTwoWeekSchedule(mode, new Date()).slice(0, 7);
  const todayKey = toLocalDateKey(new Date());

  function latestResultFor(id: AssessmentDefinition["id"]): AssessmentResult | undefined {
    if (id === "reaction-time") return getReactionDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    if (id === "symptom-check-in") return getPcssDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    if (id === "balance") return getBalanceDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    if (id === "memory") return getMemoryDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    return mode === "demo" ? getMostRecentResult(id) : undefined;
  }

  function startAssessment(definition: AssessmentDefinition) {
    const routes: Partial<Record<AssessmentDefinition["id"], string>> = {
      "symptom-check-in": "/app/assessments/pcss",
      "reaction-time": "/app/assessments/reaction-time",
      memory: "/app/assessments/memory",
      balance: "/app/assessments/balance",
    };
    const route = routes[definition.id];
    if (route) navigate(route);
    else setActiveRunner(definition);
  }

  function changeTab(value: string) {
    const next = value as CheckInTab;
    setSearchParams(next === "today" ? {} : { tab: next }, { replace: true });
  }

  const assessmentOrder: AssessmentDefinition["id"][] = ["symptom-check-in", "reaction-time", "memory", "balance"];
  const availableAssessments = [...assessmentDefinitions].sort(
    (a, b) => assessmentOrder.indexOf(a.id) - assessmentOrder.indexOf(b.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Check In" context="Start with symptoms. Add a task only if you need it." />

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-5">
          <Card className="p-6 sm:p-8">
              <div>
                <Badge tone="caution" showDot>Recommended first</Badge>
                <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">Daily symptom check-in</h2>
                <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                  Give SomatoSync a quick update.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button asChild>
                    <Link to="/app/assessments/voice-check-in"><Mic className="mr-1 h-4 w-4" />Talk through check-in</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to="/app/assessments/pcss">Use form<ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                  {latestPcss && <span className="text-[16px] text-[var(--color-text-secondary)]">Last result: <strong className="text-[var(--color-text-primary)]">{latestPcss.totalSeverity} / 132</strong></span>}
                </div>
                <p className="mt-5 border-t border-[var(--color-border)] pt-4 text-[16px] text-[var(--color-text-tertiary)]">You do not need every assessment every day.</p>
              </div>
          </Card>

          <section data-focus-secondary="true">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">Optional tasks</h2>
                <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">Only when useful.</p>
              </div>
              <Button variant="ghost" size="sm" asChild><Link to="/app/check-in?tab=schedule">View schedule</Link></Button>
            </div>
            <div className="space-y-3">
              {availableAssessments.filter((definition) => definition.id !== "symptom-check-in").map((definition) => {
                const result = latestResultFor(definition.id);
                const interpretation = result ? interpretAssessmentResult(result) : null;
                const Icon = assessmentIcons[definition.id];
                return (
                  <Card key={definition.id} className="group p-5 sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-surface-sunken)] text-[var(--color-accent)]"><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{definition.name}</h3>
                              {definition.id === "balance" && <Badge tone="info">Experimental / trend only</Badge>}
                            </div>
                            <p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{definition.estimatedDurationMinutes} min · {definition.suggestedCadence}</p>
                          </div>
                          <Button size="sm" variant={result ? "secondary" : "primary"} onClick={() => startAssessment(definition)}>
                            <Play className="h-3.5 w-3.5" /> {result ? "Retake" : "Start"}
                          </Button>
                        </div>
                        {interpretation ? (
                          <div className="mt-3 flex items-start gap-2 border-t border-[var(--color-border)] pt-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-positive)]" />
                            <div>
                              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{interpretation.label}</p>
                              
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-[16px] text-[var(--color-text-tertiary)]">No result yet</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <details className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-low)]">
            <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">What each task can—and cannot—show</summary>
            <div className="mt-4 space-y-3 text-[16px] leading-6 text-[var(--color-text-secondary)]">
              <p><strong className="text-[var(--color-text-primary)]">PCSS:</strong> standardized symptom tracking; still self-report, not diagnosis.</p>
              <p><strong className="text-[var(--color-text-primary)]">Reaction:</strong> response-speed trend; affected by device, sleep, attention, and practice.</p>
              <p><strong className="text-[var(--color-text-primary)]">Learning & recall:</strong> repeated learning plus delayed recall; one cognitive domain only.</p>
              <p><strong className="text-[var(--color-text-primary)]">Balance:</strong> experimental webcam movement proxy; not BESS or force-plate testing.</p>
              <p><strong className="text-[var(--color-text-primary)]">Best use:</strong> interpret patterns together with daily function and qualified clinical assessment.</p>
            </div>
          </details>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/app/recovery?tab=plan" className="flex flex-1 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-info-soft)] text-[var(--color-info)]"><Route className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Log an activity response</p><p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">School, work, exercise</p></div>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            </Link>
            {latestPcss && guidance.length > 0 && (
              <Link to="/app/recovery?tab=plan" data-focus-secondary="true" className="flex flex-1 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--color-caution-soft)] text-[var(--color-caution)]"><Sparkles className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{guidance[0].title}</p><p className="mt-0.5 line-clamp-1 text-[16px] text-[var(--color-text-secondary)]">{guidance[0].suggestions[0]}</p></div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </Link>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Panel title="Latest results" description="Open a result for more detail.">
            <div className="divide-y divide-[var(--color-border)]">
              {availableAssessments.map((definition) => {
                const result = latestResultFor(definition.id);
                const interpretation = result ? interpretAssessmentResult(result) : null;
                const Icon = assessmentIcons[definition.id];
                return (
                  <div key={definition.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-surface-sunken)] text-[var(--color-accent)]"><Icon className="h-4.5 w-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{definition.name}</p>{interpretation && <Badge tone={interpretation.tone}>{interpretation.label}</Badge>}</div>
                      <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{result ? `${result.value} ${result.unit}` : "No result recorded"}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => startAssessment(definition)}>{result ? "Retake" : "Start"}</Button>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Button variant="secondary" asChild><Link to="/app/recovery?tab=progress">View trend charts <ArrowRight className="h-4 w-4" /></Link></Button>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <WeeklyScheduleView days={days} todayKey={todayKey} />
          <details className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[16px] text-[var(--color-text-secondary)] shadow-[var(--shadow-low)]">
            <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">Why are tasks spaced out?</summary>
            <p className="mt-2 leading-relaxed">Symptoms can be checked more often, while reaction, memory, and balance tasks are spaced to reduce fatigue and repeated-test effects. This is a prototype schedule, not a prescription.</p>
          </details>
        </TabsContent>
      </Tabs>

      <Disclaimer variant="block">Tracking supports pattern recognition. It does not diagnose concussion, predict an exact recovery date, or replace urgent evaluation.</Disclaimer>

      <AssessmentRunnerDialog definition={activeRunner} onOpenChange={(open) => !open && setActiveRunner(null)} onComplete={() => show({ title: "Result saved", description: `${activeRunner?.name} result recorded.`, tone: "success" })} />
    </div>
  );
}
