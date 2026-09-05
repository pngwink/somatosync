import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export function PrivacyStatusBar() {
  return (
    <div className="border-b border-[var(--color-positive)]/15 bg-[var(--color-positive-soft)] px-4 py-1.5 sm:px-6">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 text-[16px] text-[var(--color-text-secondary)]">
        <div className="flex min-w-0 items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-positive)]" aria-hidden="true" />
          <span className="truncate">Private by default · you choose what to share</span>
        </div>
        <Link to="/app/privacy" className="shrink-0 font-semibold text-[var(--color-positive)] hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
}
