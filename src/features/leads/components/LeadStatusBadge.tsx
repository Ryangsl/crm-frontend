import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import type { LeadStatus } from '../types/lead';

const LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  in_progress: 'Em andamento',
  qualified: 'Qualificado',
  disqualified: 'Desqualificado',
  converted: 'Convertido',
};

const TONES: Record<LeadStatus, BadgeTone> = {
  new: 'info',
  in_progress: 'warning',
  qualified: 'success',
  disqualified: 'danger',
  converted: 'success',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
