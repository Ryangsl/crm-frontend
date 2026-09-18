import type { LeadStatus } from '../types/lead';

const LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  in_progress: 'Em andamento',
  qualified: 'Qualificado',
  disqualified: 'Desqualificado',
  converted: 'Convertido',
};

const CLASSES: Record<LeadStatus, string> = {
  new: 'bg-brand-50 text-brand-900',
  in_progress: 'bg-brand-50 text-brand-900',
  qualified: 'bg-surface text-success border border-success',
  disqualified: 'bg-surface text-danger border border-danger',
  converted: 'bg-surface text-success border border-success',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
