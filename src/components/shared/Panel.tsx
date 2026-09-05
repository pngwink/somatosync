import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, description, actions, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      <div className="flex items-start justify-between gap-5 px-6 pb-3 pt-6 sm:px-7 sm:pt-7">
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          {description && <p data-focus-secondary="true" className="mt-1.5 max-w-[68ch] text-[15.5px] leading-7 text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="px-6 pb-6 pt-4 sm:px-7 sm:pb-7">{children}</div>
    </section>
  );
}

export function PanelDivider({ className }: { className?: string }) {
  return <hr className={cn("my-6 border-t border-[var(--color-border)]", className)} />;
}
