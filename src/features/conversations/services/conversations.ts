import { apiGet, apiPost } from '@/services/api';
import type {
  AssigneeListResponse,
  Conversation,
  ConversationCreateInput,
  ConversationListResponse,
  ListConversationsParams,
  Message,
  MessageCreateInput,
  MessagePage,
} from '../types/conversations';

const MESSAGE_PAGE_SIZE = 20;

export function listConversations(
  params: ListConversationsParams = {},
): Promise<ConversationListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.unassigned) query.set('unassigned', 'true');
  if (params.customer_id) query.set('customer_id', params.customer_id);
  if (params.lead_id) query.set('lead_id', params.lead_id);
  if (params.opportunity_id) query.set('opportunity_id', params.opportunity_id);
  const qs = query.toString();
  return apiGet<ConversationListResponse>(`/v1/conversations${qs ? `?${qs}` : ''}`);
}

export function getConversation(id: string): Promise<Conversation> {
  return apiGet<Conversation>(`/v1/conversations/${id}`);
}

export function createConversation(input: ConversationCreateInput): Promise<Conversation> {
  return apiPost<Conversation>('/v1/conversations', input);
}

export function assignConversation(id: string, userId: string | null): Promise<Conversation> {
  return apiPost<Conversation>(`/v1/conversations/${id}/assign`, { user_id: userId });
}

export function closeConversation(id: string): Promise<Conversation> {
  return apiPost<Conversation>(`/v1/conversations/${id}/close`);
}

export function reopenConversation(id: string): Promise<Conversation> {
  return apiPost<Conversation>(`/v1/conversations/${id}/reopen`);
}

// Cursor opaco devolvido pelo backend em `next_cursor`: nunca montado no cliente. A API devolve
// da mensagem mais recente para a mais antiga.
export function listMessages(conversationId: string, cursor?: string): Promise<MessagePage> {
  const query = `limit=${MESSAGE_PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  return apiGet<MessagePage>(`/v1/conversations/${conversationId}/messages?${query}`);
}

export function createMessage(conversationId: string, input: MessageCreateInput): Promise<Message> {
  return apiPost<Message>(`/v1/conversations/${conversationId}/messages`, input);
}

// Usuarios do tenant para o seletor de responsavel (exige `users:read`; o backend valida a
// elegibilidade real na atribuicao).
export function listAssignees(): Promise<AssigneeListResponse> {
  return apiGet<AssigneeListResponse>('/v1/users?page=1&limit=100');
}
