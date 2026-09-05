import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { MetricLineChart } from "../components/charts/MetricLineChart";
import { ActivitySymptomChart } from "../components/charts/ActivitySymptomChart";
import { SegmentedControl } from "../components/forms/SegmentedControl";
import { Disclaimer } from "../components/shared/Disclaimer";
import { NewUserEmptyState } from "../components/shared/NewUserEmptyState";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAppMode } from "../context/AppModeContext";
import { loadPcssHistory, getPcssDashboardRow } from "../features/assessments/pcss/pcssStorage";
import { loadReactionHistory, getReactionDashboardRow } from "../features/assessments/reaction/reactionStorage";
import { loadMemoryHistory, getMemoryDashboardRow } from "../features/assessments/memory/memoryStorage";
import { loadBalanceHistory, getBalanceDashboardRow } from "../features/assessments/balance/balanceStorage";
import { interpretAssessmentResult } from "../features/assessments/shared/resultInterpretation";
import { buildRecoveryEvidenceSummary } from "../features/recovery/evidenceSummary";
import { formatDate } from "../lib/utils";
import type { AssessmentResult } from "../types";

type Range = "7d" | "14d" | "30d" | "all";

const demoPcssSeries = [
  { date: "2026-07-15", value: 62 },
  { date: "2026-07-17", value: 54 },
  { date: "2026-07-19", value: 47 },
  { date: "2026-07-21", value: 39 },
  { date: "2026-07-23", value: 31 },
  { date: "2026-07-25", value: 26 },
  { date: "2026-07-28", value: 18 },
];

const demoReactionSeries = [
  { date: "2026-07-16", value: 402 },
  { date: "2026-07-19", value: 368 },
  { date: "2026-07-22", value: 341 },
  { date: "2026-07-25", value: 318 },
  { date: "2026-07-28", value: 299 },
];

const demoMemorySeries = [
  { date: "2026-07-16", value: 4 },
  { date: "2026-07-19", value: 5 },
  { date: "2026-07-23", value: 7 },
  { date: "2026-07-27", value: 7 },
];

const demoBalanceSeries = [
  { date: "2026-07-15", value: 1.46 },
  { date: "2026-07-18", value: 1.28 },
  { date: "2026-07-21", value: 1.06 },
  { date: "2026-07-24", value: 0.94 },
  { date: "2026-07-26", value: 0.82 },
];

const activitySymptomData = [
  { date: "2026-07-22", screenHours: 1.5, symptomBurden: 2 },
  { date: "2026-07-23", screenHours: 4, symptomBurden: 5 },
  { date: "2026-07-24", screenHours: 2, symptomBurden: 2 },
  { date: "2026-07-25", screenHours: 5, symptomBurden: 6 },
  { date: "2026-07-26", screenHours: 1.5, symptomBurden: 2 },
  { date: "2026-07-27", screenHours: 4, symptomBurden: 4 },
  { date: "2026-07-28", screenHours: 2.5, symptomBurden: 3 },
];

const recoveryEvents = [
  { date: "2026-07-14", label: "Injury occurred" },
  { date: "2026-07-16", label: "Initial clinical evaluation" },
  { date: "2026-07-21", label: "Began graded return to learning" },
  { date: "2026-07-26", label: "Partial school day tolerated with supports" },
];

export function ProgressPage() {
  const { mode } = useAppMode();
  const [range, setRange] = useState<Range>("14d");

  const userReactionSeries = loadReactionHistory()
    .filter((result) => result.medianMs != null)
    .sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1))
    .map((result) => ({ date: result.completedAt.slice(0, 10), value: result.medianMs ?? 0 }));
  const userPcssSeries = loadPcssHistory()
    .sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1))
    .map((result) => ({ date: result.completedAt.slice(0, 10), value: result.totalSeverity }));
  const userMemoryHistory = loadMemoryHistory().sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  const userMemorySeries = userMemoryHistory.map((result) => ({ date: result.completedAt.slice(0, 10), value: result.delayedCorrect }));
  const userBalanceHistory = loadBalanceHistory()
    .filter((result) => result.trackingQualityPercent >= 60)
    .sort((a, b) => (a.completedAt > b.completedAt ? 1 : -1));
  const userBalanceSeries = userBalanceHistory.map((result) => ({ date: result.completedAt.slice(0, 10), value: result.lateralRmsPercent }));
  const latestUserBalance = userBalanceHistory[userBalanceHistory.length - 1] ?? null;
  const latestPcssRow = getPcssDashboardRow();
  const latestReactionRow = getReactionDashboardRow();
  const latestMemoryRow = getMemoryDashboardRow();
  const latestBalanceRow = getBalanceDashboardRow();
  const hasUserHistory = userReactionSeries.length > 0 || userPcssSeries.length > 0 || userMemorySeries.length > 0 || userBalanceSeries.length > 0;

  if (mode === "user") {
    const evidence = buildRecoveryEvidenceSummary();
    return (
      <div className="space-y-5">
        <PageHeader
          title="Detailed Progress"
          context="Each measure is shown separately instead of being collapsed into one readiness number."
          actions={<Button variant="secondary" size="sm" asChild><Link to="/app/recovery?tab=progress">Back to Recovery</Link></Button>}
        />
        {!hasUserHistory && <NewUserEmptyState title="No progress history yet" />}
        {hasUserHistory && (
          <Panel title="Multidomain pattern" description="A transparent summary of direction and evidence coverage.">
            <Badge tone={evidence.overallTone} showDot>{evidence.overallLabel}</Badge>
            <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{evidence.overallDetail}</p>
          </Panel>
        )}
        {userPcssSeries.length > 0 && (
          <Panel title="PCSS symptom severity" description="22-item symptom total; lower values mean fewer or less-severe reported symptoms.">
            {latestPcssRow && <LatestMeaning result={latestPcssRow} />}
            <MetricLineChart data={userPcssSeries} unit="of 132" reference={userPcssSeries[0].value} referenceLabel="First assessment" height={230} />
          </Panel>
        )}
        {userReactionSeries.length > 0 && (
          <Panel title="Reaction-time history" description="Reaction time in milliseconds; lower values are faster.">
            {latestReactionRow && <LatestMeaning result={latestReactionRow} />}
            <MetricLineChart data={userReactionSeries} unit="ms" reference={userReactionSeries[0].value} referenceLabel="First assessment" height={230} />
          </Panel>
        )}
        {userMemorySeries.length > 0 && (
          <Panel title="Learning and recall history" description="Delayed recall out of 10 words; each session uses an original rotating list with three learning trials and a five-minute delay.">
            {latestMemoryRow && <LatestMeaning result={latestMemoryRow} />}
            <MetricLineChart data={userMemorySeries} unit="of 10" reference={userMemorySeries[0].value} referenceLabel="First assessment" domain={[0, 10]} height={230} />
          </Panel>
        )}
        {userBalanceSeries.length > 0 && (
          <Panel title="Camera-measured lateral movement" description="Experimental RMS movement as a percentage of the camera frame; compare only similar recording conditions.">
            {latestBalanceRow && <LatestMeaning result={latestBalanceRow} />}
            {latestUserBalance && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-3.5 py-3">
                <div>
                  <p className="text-[16px] text-[var(--color-text-tertiary)]">Latest plain-language band</p>
                  <p className="mt-0.5 text-[16px] font-semibold text-[var(--color-text-primary)]">{balanceBandLabel(latestUserBalance.movementBand)}</p>
                </div>
                <p className="font-mono text-[16px] font-semibold tabular-nums text-[var(--color-text-primary)]">{latestUserBalance.lateralRmsPercent.toFixed(2)}%</p>
              </div>
            )}
            <MetricLineChart data={userBalanceSeries} unit="% frame" reference={userBalanceSeries[0].value} referenceLabel="First recording" height={230} />
          </Panel>
        )}

        <Disclaimer variant="block" />
      </div>
    );
  }

  const filtered = <T extends { date: string }>(series: T[]): T[] => {
    if (range === "all" || range === "30d") return series;
    return series.slice(range === "7d" ? -4 : -7);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Detailed Progress"
        context="Maya’s sample symptoms, cognition, and balance are displayed as separate trends."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" asChild><Link to="/app/recovery?tab=progress">Back to Recovery</Link></Button>
            <SegmentedControl<Range>
              ariaLabel="Time range"
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: "7 days" },
                { value: "14d", label: "14 days" },
                { value: "30d", label: "30 days" },
                { value: "all", label: "All" },
              ]}
            />
          </div>
        }
      />

      <Panel title="Multidomain evidence" description="No Recovery Index or readiness percentage is used.">
        <Badge tone="positive" showDot>Several domains are improving</Badge>
        <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
          Maya’s symptom burden, reaction time, delayed recall, and recorded lateral movement improved from the first sample sessions. Light sensitivity and fatigue still affect activity planning.
        </p>
      </Panel>

      <Panel title="Reported symptoms" description="PCSS-format symptom severity; lower is fewer or less-severe symptoms.">
        <MetricLineChart data={filtered(demoPcssSeries)} unit="of 132" reference={62} referenceLabel="First assessment" height={230} />
      </Panel>

      <Panel title="Cognitive and balance trends" description="Each domain remains separate because no single test determines recovery.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[16px] font-medium text-[var(--color-text-secondary)]">Reaction time — lower is faster</h3>
            <MetricLineChart data={filtered(demoReactionSeries)} unit="ms" reference={402} referenceLabel="First assessment" />
          </div>
          <div>
            <h3 className="mb-2 text-[16px] font-medium text-[var(--color-text-secondary)]">Delayed word recall — higher is more recalled</h3>
            <MetricLineChart data={filtered(demoMemorySeries)} unit="of 10" reference={4} referenceLabel="First assessment" domain={[0, 10]} />
          </div>
          <div>
            <h3 className="mb-2 text-[16px] font-medium text-[var(--color-text-secondary)]">Camera lateral movement — lower is less recorded movement</h3>
            <MetricLineChart data={filtered(demoBalanceSeries)} unit="% frame" reference={1.46} referenceLabel="First recording" />
          </div>
          <div>
            <h3 className="mb-2 text-[16px] font-medium text-[var(--color-text-secondary)]">Screen time and same-day symptoms</h3>
            <ActivitySymptomChart data={activitySymptomData} />
          </div>
        </div>
      </Panel>

      <Panel title="Recovery timeline" description="Functional events and pathway changes recorded during the demo.">
        <table className="w-full border-collapse text-left">
          <tbody>
            {recoveryEvents.map((event) => (
              <tr key={event.date} className="border-b border-[var(--color-border)] last:border-0">
                <td className="w-32 py-2.5 pr-4 text-[16px] text-[var(--color-text-tertiary)]">{formatDate(event.date, { month: "long", day: "numeric" })}</td>
                <td className="py-2.5 text-[16px] text-[var(--color-text-primary)]">{event.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Disclaimer variant="block" />
    </div>
  );
}

function LatestMeaning({ result }: { result: AssessmentResult }) {
  const interpretation = interpretAssessmentResult(result);
  return (
    <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 py-3">
      <Badge tone={interpretation.tone} showDot>{interpretation.label}</Badge>
      <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{interpretation.detail}</p>
    </div>
  );
}

function balanceBandLabel(band: string): string {
  if (band === "lower") return "Lower movement — steadier recording";
  if (band === "moderate") return "Moderate movement — watch the trend";
  if (band === "higher") return "Higher movement — elevated movement";
  return "Insufficient recording quality";
}
