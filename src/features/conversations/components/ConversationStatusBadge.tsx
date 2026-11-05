import { Badge } from '@/components/ui/Badge';
import { STATUS_LABELS } from '../lib/labels';
import type { ConversationStatus } from '../types/conversations';

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  return <Badge tone={status === 'open' ? 'info' : 'neutral'}>{STATUS_LABELS[status]}</Badge>;
}
