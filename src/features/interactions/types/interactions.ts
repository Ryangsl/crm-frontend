// F4.4 — espelha o contrato do backend (docs/05-api/openapi.yaml). `CrmEntityType` e o mesmo
// enum de D-031, reaproveitado de follow-up.
import type { CrmEntityType } from '@/features/follow-up/types/followUp';

export type { CrmEntityType };

export type InteractionDirection = 'inbound' | 'outbound';

export interface Interaction {
  id: string;
  entity_type: CrmEntityType;
  entity_id: string;
  author_id: string;
  channel: string;
  direction: InteractionDirection | null;
  summary: string;
  outcome: string | null;
  occurred_at: string;
  created_at: string;
}

export interface InteractionCreateInput {
  entity_type: CrmEntityType;
  entity_id: string;
  channel: string;
  direction?: InteractionDirection;
  summary: string;
  outcome?: string;
  occurred_at?: string;
}

// Item da linha do tempo: forma unica para interacao e nota. Para nota, `summary` e o
// conteudo e `channel`/`direction`/`outcome` sao nulos.
export interface TimelineItem {
  type: 'interaction' | 'note';
  id: string;
  occurred_at: string;
  author_id: string;
  summary: string;
  channel: string | null;
  direction: InteractionDirection | null;
  outcome: string | null;
}

export interface TimelinePage {
  data: TimelineItem[];
  next_cursor: string | null;
  has_more: boolean;
}
