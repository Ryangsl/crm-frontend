import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

// Todo componente que consome dado assincrono trata loading, empty e error
// (crm-spec/docs/06-frontend/frontend-architecture.md secao 5).
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border-subtle flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <p className="font-medium text-neutral-800">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
