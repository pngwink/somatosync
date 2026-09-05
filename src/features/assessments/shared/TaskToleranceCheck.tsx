import { useState } from "react";
import { SymptomSlider } from "../../../components/forms/SymptomSlider";
import { Button } from "../../../components/ui/button";

export interface TaskToleranceRatings {
  headache: number;
  dizziness: number;
  concentrationDifficulty: number;
  fatigue: number;
}

export const EMPTY_TASK_TOLERANCE: TaskToleranceRatings = {
  headache: 0,
  dizziness: 0,
  concentrationDifficulty: 0,
  fatigue: 0,
};

export type TaskToleranceKey = keyof TaskToleranceRatings;

const LABELS: Record<TaskToleranceKey, string> = {
  headache: "Headache",
  dizziness: "Dizziness",
  concentrationDifficulty: "Difficulty concentrating",
  fatigue: "Fatigue",
};

export function TaskToleranceCheck({
  mode,
  metrics,
  onSubmit,
  buttonLabel,
}: {
  mode: "pre" | "post";
  metrics: TaskToleranceKey[];
  onSubmit: (ratings: TaskToleranceRatings) => void;
  buttonLabel: string;
}) {
  const [ratings, setRatings] = useState<TaskToleranceRatings>(EMPTY_TASK_TOLERANCE);

  return (
    <div>
      <p className="text-[16px] leading-7 text-[var(--color-text-secondary)]">
        {mode === "pre"
          ? "Before the task, rate how you feel right now. SomatoSync keeps this separate from performance so it can track what the task costs you symptom-wise."
          : "Now rate the same symptoms again. This helps distinguish task performance from task tolerance."}
      </p>
      <div className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {metrics.map((key) => (
          <SymptomSlider
            key={key}
            id={`task-tolerance-${mode}-${key}`}
            label={LABELS[key]}
            value={ratings[key]}
            onChange={(value) => setRatings((current) => ({ ...current, [key]: value }))}
            max={6}
          />
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={() => onSubmit(ratings)}>{buttonLabel}</Button>
      </div>
    </div>
  );
}

export function taskToleranceSummary(
  pre: TaskToleranceRatings | undefined,
  post: TaskToleranceRatings | undefined,
  metrics: TaskToleranceKey[],
) {
  if (!pre || !post) return null;
  const changes = metrics.map((key) => ({ key, label: LABELS[key], delta: post[key] - pre[key] }));
  const biggestIncrease = [...changes].sort((a, b) => b.delta - a.delta)[0];
  const totalDelta = changes.reduce((sum, item) => sum + item.delta, 0);
  const detail = changes
    .map((item) => `${item.label} ${item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? item.delta : "unchanged"}`)
    .join(" · ");
  return {
    label:
      biggestIncrease && biggestIncrease.delta >= 2
        ? "Task increased symptoms"
        : totalDelta > 0
          ? "Small symptom cost"
          : totalDelta < 0
            ? "Symptoms were lower afterward"
            : "Symptoms stayed stable",
    detail,
    tone: biggestIncrease && biggestIncrease.delta >= 2 ? ("caution" as const) : totalDelta > 0 ? ("info" as const) : ("positive" as const),
  };
}
