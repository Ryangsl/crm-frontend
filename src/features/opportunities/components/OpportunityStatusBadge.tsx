import type { OpportunityStatus } from '../types/opportunity';

const LABELS: Record<OpportunityStatus, string> = {
  open: 'Aberta',
  won: 'Ganha',
  lost: 'Perdida',
};

const CLASSES: Record<OpportunityStatus, string> = {
  open: 'bg-brand-50 text-brand-900',
  won: 'bg-surface text-success border border-success',
  lost: 'bg-surface text-danger border border-danger',
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
