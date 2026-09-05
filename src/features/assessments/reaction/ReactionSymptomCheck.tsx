import { useState } from "react";
import { SymptomSlider } from "../../../components/forms/SymptomSlider";
import { SegmentedControl } from "../../../components/forms/SegmentedControl";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { SYMPTOM_KEYS, SYMPTOM_LABELS, EMPTY_SYMPTOM_RATINGS } from "./reactionTypes";
import type { SymptomRatings } from "./reactionTypes";

interface PreCheckSubmit {
  symptoms: SymptomRatings;
  sleepHours: number | null;
  recentCaffeine: boolean | null;
  feelsAbleToTest: boolean | null;
}

interface ReactionSymptomCheckProps {
  mode: "pre" | "post";
  onSubmitPre?: (data: PreCheckSubmit) => void;
  onSubmitPost?: (symptoms: SymptomRatings) => void;
}

export function ReactionSymptomCheck({ mode, onSubmitPre, onSubmitPost }: ReactionSymptomCheckProps) {
  const [symptoms, setSymptoms] = useState<SymptomRatings>(EMPTY_SYMPTOM_RATINGS);
  const [sleepHours, setSleepHours] = useState("");
  const [recentCaffeine, setRecentCaffeine] = useState<"yes" | "no" | null>(null);
  const [feelsAble, setFeelsAble] = useState<"yes" | "no" | null>(null);

  function updateSymptom(key: keyof SymptomRatings, value: number) {
    setSymptoms((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (mode === "pre") {
      onSubmitPre?.({
        symptoms,
        sleepHours: sleepHours.trim() === "" ? null : Number(sleepHours),
        recentCaffeine: recentCaffeine === null ? null : recentCaffeine === "yes",
        feelsAbleToTest: feelsAble === null ? null : feelsAble === "yes",
      });
    } else {
      onSubmitPost?.(symptoms);
    }
  }

  const canSubmit = mode === "post" || feelsAble !== null;

  return (
    <div className="space-y-1">
      <p className="mb-3 text-[14.5px] text-[var(--color-text-secondary)]">
        {mode === "pre"
          ? "Rate how you feel right now, before starting the test."
          : "Rate how you feel now, after completing the test."}
      </p>

      <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {SYMPTOM_KEYS.map((key) => (
          <SymptomSlider
            key={key}
            id={`symptom-${mode}-${key}`}
            label={SYMPTOM_LABELS[key]}
            value={symptoms[key]}
            onChange={(v) => updateSymptom(key, v)}
            max={6}
          />
        ))}
      </div>

      {mode === "pre" && (
        <div className="grid gap-5 pt-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sleep-hours">Hours of sleep last night</Label>
            <Input
              id="sleep-hours"
              type="number"
              min={0}
              max={16}
              step={0.5}
              inputMode="decimal"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Caffeine in the last 2 hours?</Label>
            <SegmentedControl
              ariaLabel="Recent caffeine"
              value={(recentCaffeine ?? "") as "yes" | "no"}
              onChange={(v) => setRecentCaffeine(v as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Do you feel able to complete this test right now?</Label>
            <SegmentedControl
              ariaLabel="Feels able to complete test"
              value={(feelsAble ?? "") as "yes" | "no"}
              onChange={(v) => setFeelsAble(v as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {mode === "pre" ? "Continue to practice trials" : "View results"}
        </Button>
      </div>
    </div>
  );
}
