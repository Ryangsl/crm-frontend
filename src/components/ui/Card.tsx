import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  // Acao no canto do titulo, ex.: "Ver todos".
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, footer, children, className = '' }: CardProps) {
  return (
    <section
      className={`bg-surface border-border-subtle rounded-card shadow-card min-w-0 border p-4 lg:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-neutral-900">{title}</h2>}
          {action}
        </div>
      )}
      <div className="text-sm text-neutral-700">{children}</div>
      {footer && <div className="border-border-subtle mt-4 border-t pt-3">{footer}</div>}
    </section>
  );
}
