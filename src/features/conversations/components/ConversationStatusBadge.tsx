import { STATUS_LABELS } from '../lib/labels';
import type { ConversationStatus } from '../types/conversations';

const CLASSES: Record<ConversationStatus, string> = {
  open: 'bg-brand-50 text-brand-900',
  closed: 'bg-surface text-neutral-600 border border-border-subtle',
};

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
