// F4.6 — espelha o contrato do backend (docs/05-api/openapi.yaml). O core e agnostico a canal:
// hoje o unico `channel_type` e "manual". Nada de status de entrega nem provider (Fase 5).
export type ConversationStatus = 'open' | 'closed';
export type MessageDirection = 'inbound' | 'outbound';
export type ConversationEntityType = 'customer' | 'lead' | 'opportunity';

export interface ConversationContext {
  customer_name: string | null;
  lead_name: string | null;
  lead_status: string | null;
  opportunity_status: string | null;
}

export interface Conversation {
  id: string;
  channel_type: string;
  status: ConversationStatus;
  customer_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  context: ConversationContext;
  assigned_to: string | null;
  assigned_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  data: Conversation[];
  page: number;
  limit: number;
  total: number;
}

export interface ListConversationsParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  unassigned?: boolean;
  customer_id?: string;
  lead_id?: string;
  opportunity_id?: string;
}

export interface ConversationCreateInput {
  customer_id?: string;
  lead_id?: string;
  opportunity_id?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection | null;
  sender_user_id: string | null;
  content: string;
  created_at: string;
}

export interface MessagePage {
  data: Message[];
  next_cursor: string | null;
}

export interface MessageCreateInput {
  content: string;
  direction?: MessageDirection;
}

// Usuario selecionavel como responsavel (so quem tem `users:read` ve o seletor).
export interface AssigneeOption {
  id: string;
  name: string;
  status: string;
}

export interface AssigneeListResponse {
  data: AssigneeOption[];
}
