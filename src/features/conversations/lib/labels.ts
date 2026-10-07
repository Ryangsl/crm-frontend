import type { Conversation, ConversationStatus, MessageDirection } from '../types/conversations';

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Aberta',
  closed: 'Encerrada',
};

export const DIRECTION_LABELS: Record<MessageDirection, string> = {
  inbound: 'Entrada',
  outbound: 'Saida',
};

// Erros de dominio do core de conversas -> texto para o usuario.
export function conversationErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'CONVERSATION_CLOSED':
      return 'A conversa esta encerrada. Reabra-a para continuar.';
    case 'CONVERSATION_NOT_CLOSED':
      return 'A conversa nao esta encerrada.';
    case 'CONVERSATION_ASSIGNEE_INELIGIBLE':
      return 'Esse usuario nao pode receber conversas (inativo ou sem permissao de atendimento).';
    case 'CONVERSATION_REFERENCE_MISMATCH':
      return 'Os vinculos informados nao sao coerentes entre si.';
    default:
      return fallback;
  }
}

// Titulo exibido da conversa: o contexto CRM mais proximo do contato.
export function conversationTitle(conversation: Conversation): string {
  return (
    conversation.context.customer_name ??
    conversation.context.lead_name ??
    (conversation.opportunity_id ? 'Oportunidade' : 'Conversa')
  );
}
