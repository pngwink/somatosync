import { Slider } from "../ui/slider";
import { Label } from "../ui/label";

interface SymptomSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  max?: number;
}

export function SymptomSlider({ id, label, value, onChange, lowLabel = "None", highLabel = "Severe", max = 10 }: SymptomSliderProps) {
  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-[14px] tabular-nums text-[var(--color-text-secondary)]">{value} / {max}</span>
      </div>
      <Slider
        id={id}
        min={0}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
        aria-valuetext={`${value} of ${max}`}
      />
      <div className="mt-1.5 flex justify-between text-[14.5px] text-[var(--color-text-tertiary)]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
