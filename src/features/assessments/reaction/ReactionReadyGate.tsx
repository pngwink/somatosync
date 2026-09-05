import { Button } from "../../../components/ui/button";

interface ReactionReadyGateProps {
  heading: string;
  description: string;
  buttonLabel: string;
  onStart: () => void;
}

/** The one-time gate screen shown before the practice block and again before the scored block. */
export function ReactionReadyGate({ heading, description, buttonLabel, onStart }: ReactionReadyGateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{heading}</h3>
      <p className="max-w-sm text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
      <Button onClick={onStart}>{buttonLabel}</Button>
    </div>
  );
}
