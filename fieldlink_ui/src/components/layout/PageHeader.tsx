import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions, icon, className }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</div>}
        <div>
          {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-soft">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
