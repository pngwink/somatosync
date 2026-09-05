import { Check, ChevronRight, Circle, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import type { ScheduledAssessment } from "./scheduleTypes";

interface CalendarDay { date: Date; dateKey: string; tasks: ScheduledAssessment[]; }
interface WeeklyScheduleViewProps { days: CalendarDay[]; todayKey: string; }

function statusLabel(status: ScheduledAssessment["status"]) {
  if (status === "completed") return { label: "Done", tone: "positive" as const };
  if (status === "due-today") return { label: "Today", tone: "caution" as const };
  if (status === "upcoming") return { label: "Planned", tone: "info" as const };
  if (status === "overdue") return { label: "Skipped", tone: "neutral" as const };
  return { label: "Open", tone: "neutral" as const };
}

function duration(task: ScheduledAssessment) {
  if (task.assessmentType === "symptom-check-in") return "4 min";
  if (task.assessmentType === "memory") return "7 min";
  return "2–3 min";
}

export function WeeklyScheduleView({ days, todayKey }: WeeklyScheduleViewProps) {
  const todayIndex = Math.max(0, days.findIndex((day) => day.dateKey === todayKey));
  const today = days[todayIndex] ?? days[0];
  const activeTasks = days.flatMap((day) => day.tasks).filter((task) => task.status !== "not-started");
  const completedCount = activeTasks.filter((task) => task.status === "completed").length;
  const laterTasks = days.slice(todayIndex + 1).flatMap((day) => day.tasks.map((task) => ({ ...task, dateObject: day.date }))).filter((task) => task.status === "upcoming").slice(0, 4);
  const percent = activeTasks.length ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.13em] text-[var(--color-accent)]">Your week</p>
            <h2 className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{completedCount} of {activeTasks.length} completed</h2>
          </div>
          <Badge tone={percent >= 70 ? "positive" : "accent"}>{percent}%</Badge>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${percent}%` }} /></div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible" aria-label="Seven-day schedule">
          {days.map((day) => {
            const isToday = day.dateKey === todayKey;
            const done = day.tasks.length > 0 && day.tasks.every((task) => task.status === "completed");
            const hasTask = day.tasks.some((task) => task.status === "upcoming" || task.status === "due-today");
            return (
              <div key={day.dateKey} className={cn("min-w-[66px] rounded-[15px] border px-2 py-3 text-center", isToday ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
                <p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{day.date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</p>
                <p className="mt-1 text-[17px] font-semibold text-[var(--color-text-primary)]">{day.date.getDate()}</p>
                <span className={cn("mx-auto mt-2 block h-2 w-2 rounded-full", done ? "bg-[var(--color-positive)]" : isToday ? "bg-[var(--color-caution)]" : hasTask ? "bg-[var(--color-info)]" : "bg-[var(--color-border-strong)]")} aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[16px] font-semibold uppercase tracking-[0.13em] text-[var(--color-text-tertiary)]">Today</p><h3 className="mt-1 text-[17px] font-semibold text-[var(--color-text-primary)]">{today?.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3></div>
          <Clock3 className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        </div>
        <div className="mt-4 divide-y divide-[var(--color-border)]">
          {today?.tasks.length ? today.tasks.map((task) => {
            const status = statusLabel(task.status);
            return (
              <div key={`${task.date}-${task.assessmentType}`} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", task.status === "completed" ? "bg-[var(--color-positive-soft)] text-[var(--color-positive)]" : "bg-[var(--color-caution-soft)] text-[var(--color-caution)]")}>{task.status === "completed" ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{task.label}</p><Badge tone={status.tone}>{status.label}</Badge></div><p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{duration(task)}</p></div>
                {task.status === "due-today" || task.status === "upcoming" ? <Button size="sm" asChild><Link to={task.href}>Start</Link></Button> : null}
              </div>
            );
          }) : <p className="rounded-[14px] bg-[var(--color-surface-sunken)] p-4 text-[16px] text-[var(--color-text-secondary)]">No tasks are scheduled today.</p>}
        </div>
      </Card>

      {laterTasks.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 pb-2 pt-5"><h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Later this week</h3></div>
          <div className="divide-y divide-[var(--color-border)]">
            {laterTasks.map((task) => (
              <Link key={`${task.date}-${task.assessmentType}`} to={task.href} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--color-surface-sunken)]">
                <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{task.label}</p><p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{task.dateObject.toLocaleDateString(undefined, { weekday: "long" })} · {duration(task)}</p></div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
