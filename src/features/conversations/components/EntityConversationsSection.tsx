import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { useConversationsQuery, useCreateConversation } from '../hooks/useConversations';
import { conversationErrorMessage } from '../lib/labels';
import type { ConversationEntityType, ListConversationsParams } from '../types/conversations';
import { ConversationStatusBadge } from './ConversationStatusBadge';

interface EntityConversationsSectionProps {
  entityType: ConversationEntityType;
  entityId: string;
}

const FILTER_KEY: Record<ConversationEntityType, keyof ListConversationsParams> = {
  customer: 'customer_id',
  lead: 'lead_id',
  opportunity: 'opportunity_id',
};

// F4.6: conversas ligadas a ESTA entidade (vinculo dedicado, sem herdar de Lead/Cliente) e o
// ponto de entrada para abrir uma nova. Abrir conversa nao converte Lead em Cliente (BR-28).
export function EntityConversationsSection({
  entityType,
  entityId,
}: EntityConversationsSectionProps) {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canRead = hasPermission('conversations:read');
  const canCreate = hasPermission('conversations:create');

  const params: ListConversationsParams = { limit: 20, [FILTER_KEY[entityType]]: entityId };
  const { data, isPending, isError, error, refetch } = useConversationsQuery(params, canRead);
  const createMutation = useCreateConversation();
  const [createError, setCreateError] = useState<string | null>(null);

  if (!canRead) return null;

  async function handleOpen() {
    setCreateError(null);
    try {
      const created = await createMutation.mutateAsync({ [FILTER_KEY[entityType]]: entityId });
      navigate(`/conversations/${created.id}`);
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? conversationErrorMessage(err.code, err.message)
          : 'Nao foi possivel abrir a conversa.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Conversas</h2>
        {canCreate && (
          <Button
            size="sm"
            variant="secondary"
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onClick={() => void handleOpen()}
          >
            Abrir conversa
          </Button>
        )}
      </div>

      {createError && (
        <Alert tone="danger" title="Nao foi possivel abrir a conversa">
          {createError}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando conversas...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar as conversas">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          title="Nenhuma conversa"
          description="Conversas deste registro aparecem aqui."
        />
      )}

      {data && data.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.data.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to={`/conversations/${conversation.id}`}
                className="border-border-subtle hover:bg-surface-muted flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <span className="text-sm text-neutral-800">
                  {conversation.last_message_at
                    ? `Ultima mensagem em ${new Date(conversation.last_message_at).toLocaleString('pt-BR')}`
                    : 'Sem mensagens'}
                </span>
                <ConversationStatusBadge status={conversation.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
