import type { ReactNode } from "react";
import { PlayCircle } from "lucide-react";
import { Wordmark } from "../../components/navigation/Wordmark";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-low)]">
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
          <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function DemoAccessButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-bold text-[var(--color-text-primary)]">Open Maya Chen Demo</span>
        <span className="mt-0.5 block text-[16px] leading-6 text-[var(--color-text-secondary)]">
          Explore the complete Maya demo. No sign-in needed.
        </span>
      </span>
    </button>
  );
}
