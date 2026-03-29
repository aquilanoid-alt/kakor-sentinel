import type { ReactNode } from "react";

interface SectionCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ eyebrow, title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="surface-card rounded-[32px] p-6 backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.35em] text-aqua/70">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 font-heading text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-mist/70">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
