import { cn } from "../../lib/utils";
import { Link } from "react-router-dom";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/app"
      className={cn("inline-flex items-center gap-1.5 font-display text-[16px] font-bold tracking-tight text-[var(--color-text-primary)]", className)}
      aria-label="SomatoSync home"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-[var(--color-accent)] font-mono text-[14px] font-bold text-[var(--color-accent-foreground)]">
        s
      </span>
      <span>
        Somato<span className="text-[var(--color-accent)]">Sync</span>
      </span>
    </Link>
  );
}
