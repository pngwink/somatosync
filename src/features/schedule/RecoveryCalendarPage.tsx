import { AlertTriangle, CalendarDays, Clock3, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { PageHeader } from "../../components/shared/PageHeader";
import { Panel } from "../../components/shared/Panel";
import { useAppMode } from "../../context/AppModeContext";
import { cn } from "../../lib/utils";
import { scheduleDefinitions } from "./scheduleData";
import { buildTwoWeekSchedule, getLatestAttentionItems, toLocalDateKey } from "./scheduleEngine";
import type { ScheduleStatus } from "./scheduleTypes";

const statusPresentation: Record<ScheduleStatus, { label: string; tone: "neutral" | "positive" | "caution" | "risk" | "info"; className: string }> = {
  completed: { label: "Completed", tone: "positive", className: "border-[var(--color-positive)] bg-[var(--color-positive-soft)]" },
  "due-today": { label: "Due today", tone: "caution", className: "border-[var(--color-caution)] bg-[var(--color-caution-soft)]" },
  overdue: { label: "Overdue", tone: "risk", className: "border-[var(--color-risk)] bg-[var(--color-risk-soft)]" },
  upcoming: { label: "Upcoming", tone: "info", className: "border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)]" },
  "not-started": { label: "Before tracking", tone: "neutral", className: "border-[var(--color-border)] bg-[var(--color-surface-sunken)]" },
};

export function RecoveryCalendarPage() {
  const { mode } = useAppMode();
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const days = buildTwoWeekSchedule(mode, now);
  const latestItems = getLatestAttentionItems(mode);
  const overdueCount = days.flatMap((day) => day.tasks).filter((task) => task.status === "overdue").length;
  const dueTodayCount = days.flatMap((day) => day.tasks).filter((task) => task.status === "due-today").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recovery Calendar"
        context="A spaced assessment plan that avoids asking you to complete every neurological task every day."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Due today" value={dueTodayCount} detail="amber means scheduled for today" tone="caution" />
        <SummaryCard label="Overdue" value={overdueCount} detail="red means overdue, not a medical emergency" tone="risk" />
        <SummaryCard label="Current results" value={latestItems.length} detail="each domain stays separate" tone="info" />
      </div>

      <Panel
        title="Two-week assessment calendar"
        description="Default prototype schedule. A clinician can change the cadence based on symptoms, age, stage of recovery, and tolerance."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const isToday = day.dateKey === todayKey;
            return (
              <div
                key={day.dateKey}
                className={cn(
                  "min-h-44 rounded-[var(--radius-md)] border p-3",
                  isToday ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {day.date.getDate()}
                    </p>
                  </div>
                  {isToday && <Badge tone="accent">Today</Badge>}
                </div>

                <div className="mt-3 space-y-2">
                  {day.tasks.map((task) => {
                    const presentation = statusPresentation[task.status];
                    return (
                      <Link
                        key={`${task.date}-${task.assessmentType}`}
                        to={task.href}
                        className={cn("block rounded-[var(--radius-sm)] border-l-4 px-2.5 py-2 transition hover:brightness-95", presentation.className)}
                      >
                        <p className="text-[14.5px] font-medium text-[var(--color-text-primary)]">{task.shortLabel}</p>
                        <Badge tone={presentation.tone} showDot className="mt-0.5 text-[14.5px]">
                          {presentation.label}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-border)] pt-4 text-[14.5px]">
          <Badge tone="positive" showDot>Completed</Badge>
          <Badge tone="caution" showDot>Due today</Badge>
          <Badge tone="risk" showDot>Overdue in schedule</Badge>
          <Badge tone="info" showDot>Upcoming</Badge>
          <Badge tone="neutral" showDot>Before tracking began</Badge>
        </div>
      </Panel>

      <Panel title="Suggested frequency" description="Why the prototype spaces each domain differently">
        <div className="grid gap-3 md:grid-cols-2">
          {scheduleDefinitions.map((definition) => (
            <Card key={definition.assessmentType} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{definition.label}</h3>
                  <p className="mt-1 text-[14.5px] font-medium text-[var(--color-accent)]">{definition.cadence}</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={definition.href}>Open</Link>
                </Button>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{definition.rationale}</p>
            </Card>
          ))}
        </div>
      </Panel>

      {latestItems.length > 0 && (
        <Panel title="Latest result meaning" description="Colors describe the user’s own trend, not clinical normal ranges.">
          <div className="divide-y divide-[var(--color-border)]">
            {latestItems.map((item) => (
              <div key={item.assessmentType} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[14.5px] font-medium text-[var(--color-text-primary)]">{item.label}</p>
                  <p className="mt-0.5 max-w-2xl text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{item.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={item.tone} showDot>{item.resultLabel}</Badge>
                  <Button variant="ghost" size="sm" asChild><Link to={item.href}>Recheck</Link></Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Card className="border-[var(--color-risk)] bg-[var(--color-risk-soft)] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-risk)]" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Schedule priority is not medical urgency</h2>
            <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
              A red calendar item only means a planned check-in was missed. Emergency warning signs—such as repeated vomiting, worsening headache, seizure, inability to wake, slurred speech, weakness, or one pupil larger than the other—require immediate medical care.
            </p>
            <a
              className="mt-2 inline-flex items-center gap-1 text-[14.5px] font-medium text-[var(--color-risk)] hover:underline"
              href="https://www.cdc.gov/heads-up/signs-symptoms/index.html"
              target="_blank"
              rel="noreferrer"
            >
              CDC concussion danger signs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </Card>

      <Disclaimer variant="block">
        This calendar is a configurable product default, not a medical prescription. Testing should stop if symptoms increase, balance feels unsafe, or a healthcare professional advises a different plan.
      </Disclaimer>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "info" | "caution" | "risk";
}) {
  const Icon = tone === "info" ? CalendarDays : tone === "caution" ? Clock3 : AlertTriangle;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14.5px] text-[var(--color-text-tertiary)]">{label}</p>
          <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
          <p className="mt-0.5 text-[14.5px] text-[var(--color-text-secondary)]">{detail}</p>
        </div>
        <Icon className={cn("h-5 w-5", tone === "info" ? "text-[var(--color-info)]" : tone === "caution" ? "text-[var(--color-caution)]" : "text-[var(--color-risk)]")} />
      </div>
    </Card>
  );
}
