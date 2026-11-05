import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import type { OpportunityStatus } from '../types/opportunity';

const LABELS: Record<OpportunityStatus, string> = {
  open: 'Aberta',
  won: 'Ganha',
  lost: 'Perdida',
};

const TONES: Record<OpportunityStatus, BadgeTone> = {
  open: 'info',
  won: 'success',
  lost: 'danger',
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
