import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  children: ReactNode;
}

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
