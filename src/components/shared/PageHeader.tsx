import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  context?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, context, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[14.5px] font-medium text-[var(--color-accent)]">{eyebrow}</p>}
        <h1 className="text-balance text-[30px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[36px] sm:leading-[1.15]">{title}</h1>
        {context && <p data-focus-secondary="true" className="mt-2 max-w-[68ch] text-[16px] leading-7 text-[var(--color-text-secondary)]">{context}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
