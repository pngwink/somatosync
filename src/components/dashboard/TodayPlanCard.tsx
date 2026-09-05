import { Link } from "react-router-dom";
import { CheckSquare, Square, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { TodayTask } from "../../types";

// Plain list -- no card wrapper, no rounded box per row. Meant to sit
// inside a Panel section alongside other related content.
export function TodayPlanCard({ tasks }: { tasks: TodayTask[] }) {
  return (
    <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
      {tasks.map((task) => (
        <Link
          key={task.id}
          to={task.href}
          className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--color-surface-sunken)]"
        >
          {task.completed ? (
            <CheckSquare className="h-4 w-4 shrink-0 text-[var(--color-positive)]" aria-hidden="true" />
          ) : (
            <Square className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[16px] font-medium",
                task.completed ? "text-[var(--color-text-tertiary)] line-through" : "text-[var(--color-text-primary)]"
              )}
            >
              {task.label}
            </p>
            <p className="mt-0.5 truncate text-[16px] text-[var(--color-text-secondary)]">{task.description}</p>
          </div>
          {task.estimatedMinutes > 0 && (
            <span className="shrink-0 text-[16px] text-[var(--color-text-tertiary)]">{task.estimatedMinutes} min</span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
