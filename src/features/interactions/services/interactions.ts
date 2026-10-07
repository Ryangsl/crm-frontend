import { apiDelete, apiGet, apiPost } from '@/services/api';
import type {
  CrmEntityType,
  Interaction,
  InteractionCreateInput,
  TimelinePage,
} from '../types/interactions';

const TIMELINE_PATH: Record<CrmEntityType, string> = {
  customer: 'customers',
  lead: 'leads',
  opportunity: 'opportunities',
};

const PAGE_SIZE = 20;

// Cursor opaco devolvido pelo backend em `next_cursor` (TD-02): nunca montado no cliente.
export function listTimeline(
  entityType: CrmEntityType,
  entityId: string,
  cursor?: string,
): Promise<TimelinePage> {
  const query = `limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  return apiGet<TimelinePage>(`/v1/${TIMELINE_PATH[entityType]}/${entityId}/interactions?${query}`);
}

export function createInteraction(input: InteractionCreateInput): Promise<Interaction> {
  return apiPost<Interaction>('/v1/interactions', input);
}

export function deleteInteraction(id: string): Promise<void> {
  return apiDelete<void>(`/v1/interactions/${id}`);
}
