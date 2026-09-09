import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, footer, children, className = '' }: CardProps) {
  return (
    <section
      className={`bg-surface border-border-subtle rounded-xl border p-4 shadow-sm ${className}`}
    >
      {title && <h2 className="mb-2 text-base font-semibold text-neutral-900">{title}</h2>}
      <div className="text-sm text-neutral-700">{children}</div>
      {footer && <div className="border-border-subtle mt-4 border-t pt-3">{footer}</div>}
    </section>
  );
}
