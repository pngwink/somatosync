import { Card } from "../ui/card";
import { AssessmentResultsTable } from "../dashboard/AssessmentResultsTable";
import { Disclaimer } from "../shared/Disclaimer";
import { Badge } from "../ui/badge";
import { formatDate } from "../../lib/utils";
import type { LiveReportData } from "../../features/reports/reportData";

interface ReportPreviewProps {
  audience: string;
  dateRangeLabel: string;
  includedMetrics: string[];
  data: LiveReportData;
}

export function ReportPreview({ audience, dateRangeLabel, includedMetrics, data }: ReportPreviewProps) {
  const improvingDomains = data.results.filter((result) => result.interpretationTone === "positive");
  const attentionDomains = data.results.filter((result) => result.interpretationTone === "caution" || result.interpretationTone === "risk");

  return (
    <Card id="report-preview" className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">SomatoSync care-team handoff</p>
          <h2 className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{data.patientName}</h2>
          <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{dateRangeLabel} · Prepared for {audience}</p>
          <p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{data.contextLabel}</p>
        </div>
        <p className="text-right text-[16px] text-[var(--color-text-tertiary)]">Generated {formatDate(new Date().toISOString())}</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div><p className="text-[16px] text-[var(--color-text-tertiary)]">Recovery day</p><p className="font-mono text-[16px] font-medium text-[var(--color-text-primary)]">{data.recoveryDayLabel}</p></div>
        <div><p className="text-[16px] text-[var(--color-text-tertiary)]">Measured domains</p><p className="font-mono text-[16px] font-medium text-[var(--color-text-primary)]">{data.results.length} assessment signals</p></div>
        <div><p className="text-[16px] text-[var(--color-text-tertiary)]">Current pathways</p><p className="text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">{data.currentPathways.length} tracked</p></div>
      </div>

      {includedMetrics.includes("summary") && (
        <section className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
          <p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">One-page recovery handoff</p>
          <h3 className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)]">{data.overallPattern}</h3>
          <p className="mt-1.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{data.overallDetail}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SummaryList title="Main improving areas" tone="positive" empty="No domain has enough comparable data to label as improving." items={data.improvingEvidence.map((item) => `${item.label}: ${item.headline}. ${item.detail}`)} />
            <SummaryList title="Areas to discuss or recheck" tone="caution" empty="No measured domain is currently flagged for attention." items={data.attentionEvidence.map((item) => `${item.label}: ${item.headline}. ${item.detail}`)} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Activity response</p><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{data.activitySummary}</p></div>
            <div><p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Accommodations used</p>{data.helpfulAccommodations.length ? <ul className="mt-1 space-y-1 text-[16px] text-[var(--color-text-secondary)]">{data.helpfulAccommodations.map((item) => <li key={item}>· {item}</li>)}</ul> : <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">No Focus Mode adaptation has been recorded in this range.</p>}</div>
          </div>

          <div className="mt-4"><p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Current pathway stages</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{data.currentPathways.map((item) => <div key={item.label} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"><p className="text-[16px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{item.label}</p><p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">{item.stage}</p></div>)}</div></div>
        </section>
      )}

      {data.results.length === 0 && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">No assessment results in this date range</p>
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">The handoff can still include pathway and activity information. Choose a longer range for earlier assessment results.</p>
        </div>
      )}

      {includedMetrics.includes("improvements") && data.results.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><h3 className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-positive)]">Latest assessment interpretations</h3>{improvingDomains.length > 0 ? <ul className="mt-1.5 space-y-1.5 text-[16px] text-[var(--color-text-primary)]">{improvingDomains.slice(0, 5).map((result) => <li key={result.id}>· {result.interpretationLabel}: {result.interpretationDetail}</li>)}</ul> : <p className="mt-1.5 text-[16px] text-[var(--color-text-secondary)]">No latest assessment is labeled as improving.</p>}</div>
          <div><h3 className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-caution)]">Latest results needing attention</h3>{attentionDomains.length > 0 ? <ul className="mt-1.5 space-y-1.5 text-[16px] text-[var(--color-text-primary)]">{attentionDomains.slice(0, 5).map((result) => <li key={result.id}>· {result.interpretationLabel}: {result.interpretationDetail}</li>)}</ul> : <p className="mt-1.5 text-[16px] text-[var(--color-text-secondary)]">No latest assessment is currently labeled as needing attention.</p>}</div>
        </div>
      )}

      {includedMetrics.includes("assessments") && data.results.length > 0 && (
        <div className="mt-6"><h3 className="mb-2 text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Latest assessment results</h3><AssessmentResultsTable results={data.results} showLink={false} /></div>
      )}

      {includedMetrics.includes("questions") && (
        <div className="mt-6"><h3 className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Questions for the care team</h3><ul className="mt-1.5 space-y-1 text-[16px] text-[var(--color-text-primary)]">{data.suggestedQuestions.map((question) => <li key={question}>· {question}</li>)}</ul></div>
      )}

      <div className="mt-6"><p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Important limitations</p><ul className="mt-1.5 space-y-1 text-[16px] text-[var(--color-text-secondary)]">{data.limitations.map((item) => <li key={item}>· {item}</li>)}</ul></div>

      <Disclaimer variant="block" className="mt-6">This report summarizes self-reported symptoms, browser-based tasks, activity tolerance, and optional Focus Mode aggregates. It does not diagnose concussion, estimate a personal recovery date, or provide return-to-school, work, driving, or sport clearance.</Disclaimer>
    </Card>
  );
}

function SummaryList({ title, tone, empty, items }: { title: string; tone: "positive" | "caution"; empty: string; items: string[] }) {
  return (
    <div>
      <Badge tone={tone} showDot>{title}</Badge>
      {items.length ? <ul className="mt-2 space-y-1.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{items.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}</ul> : <p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">{empty}</p>}
    </div>
  );
}
