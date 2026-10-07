import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { ConversationStatusBadge } from '../components/ConversationStatusBadge';
import { MessageComposer } from '../components/MessageComposer';
import {
  useAssigneesQuery,
  useAssignConversation,
  useCloseConversation,
  useConversationQuery,
  useMessagesQuery,
  useReopenConversation,
} from '../hooks/useConversations';
import { conversationErrorMessage, conversationTitle, DIRECTION_LABELS } from '../lib/labels';

function actionError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Voce nao tem permissao para esta acao.';
    return conversationErrorMessage(err.code, err.message);
  }
  return fallback;
}

// F4.6: uma conversa do core (canal "manual"): contexto CRM, responsavel (atribuicao manual),
// encerrar/reabrir e historico de mensagens com cursor ("carregar anteriores"). Sem envio real a
// canal algum, sem tempo real e sem anexos.
export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id as string;
  const { user, hasPermission } = useAuth();
  const canRead = hasPermission('conversations:read');
  const canUpdate = hasPermission('conversations:update');
  const canAssign = hasPermission('conversations:assign');
  const canListUsers = hasPermission('users:read');

  const conversationQuery = useConversationQuery(canRead ? id : undefined);
  const messagesQuery = useMessagesQuery(id, canRead);
  const assignees = useAssigneesQuery(canRead && canAssign && canListUsers);
  const assignMutation = useAssignConversation(conversationId);
  const closeMutation = useCloseConversation(conversationId);
  const reopenMutation = useReopenConversation(conversationId);

  const [selectedUser, setSelectedUser] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!canRead) {
    return (
      <Alert tone="warning" title="Sem permissao">
        Voce nao tem permissao para ver conversas.
      </Alert>
    );
  }

  if (conversationQuery.isPending) {
    return (
      <p className="flex items-center gap-2 text-neutral-600">
        <Spinner size="sm" /> Carregando conversa...
      </p>
    );
  }

  if (conversationQuery.isError || !conversationQuery.data) {
    const notFound =
      conversationQuery.error instanceof ApiError && conversationQuery.error.status === 404;
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="danger" title={notFound ? 'Conversa nao encontrada' : 'Erro ao carregar'}>
          {notFound
            ? 'A conversa nao existe ou voce nao tem acesso a ela.'
            : 'Nao foi possivel carregar a conversa.'}
        </Alert>
        <Link to="/conversations" className="text-brand-700 text-sm underline">
          Voltar para conversas
        </Link>
      </div>
    );
  }

  const conversation = conversationQuery.data;
  const isOpen = conversation.status === 'open';
  // A API devolve da mais recente para a mais antiga; a tela mostra em ordem cronologica.
  const messages = (messagesQuery.data?.pages.flatMap((page) => page.data) ?? []).slice().reverse();
  const assigneeName = (assigneeId: string | null): string => {
    if (!assigneeId) return 'Sem responsavel';
    if (assigneeId === user?.id) return 'Voce';
    return assignees.data?.find((option) => option.id === assigneeId)?.name ?? 'Outro usuario';
  };

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(actionError(err, fallback));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link to="/conversations" className="text-brand-700 text-sm underline">
          Conversas
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">
            {conversationTitle(conversation)}
          </h1>
          <ConversationStatusBadge status={conversation.status} />
        </div>
      </header>

      {error && (
        <Alert tone="danger" title="Nao foi possivel concluir a acao">
          {error}
        </Alert>
      )}

      <Card title="Contexto">
        <ul className="flex flex-col gap-1">
          {conversation.customer_id && (
            <li>
              Cliente:{' '}
              <Link
                className="text-brand-700 underline"
                to={`/customers/${conversation.customer_id}`}
              >
                {conversation.context.customer_name ?? 'Ver cliente'}
              </Link>
            </li>
          )}
          {conversation.lead_id && (
            <li>
              Lead:{' '}
              <Link className="text-brand-700 underline" to={`/leads/${conversation.lead_id}`}>
                {conversation.context.lead_name ?? 'Ver lead'}
              </Link>
            </li>
          )}
          {conversation.opportunity_id && (
            <li>
              Oportunidade:{' '}
              <Link
                className="text-brand-700 underline"
                to={`/opportunities/${conversation.opportunity_id}`}
              >
                Ver oportunidade
              </Link>
            </li>
          )}
          <li className="text-neutral-500">Canal: {conversation.channel_type}</li>
        </ul>
      </Card>

      <Card title="Responsavel">
        <p>{assigneeName(conversation.assigned_to)}</p>
        {canAssign && isOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {canListUsers ? (
              <Select
                label="Atribuir a"
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
              >
                <option value="">Selecione...</option>
                {(assignees.data ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {canListUsers && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedUser || assignMutation.isPending}
                  loading={assignMutation.isPending}
                  onClick={() =>
                    void run(
                      () => assignMutation.mutateAsync(selectedUser),
                      'Nao foi possivel atribuir a conversa.',
                    )
                  }
                >
                  Atribuir
                </Button>
              )}
              {user && conversation.assigned_to !== user.id && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={assignMutation.isPending}
                  onClick={() =>
                    void run(
                      () => assignMutation.mutateAsync(user.id),
                      'Nao foi possivel atribuir a conversa.',
                    )
                  }
                >
                  Atribuir a mim
                </Button>
              )}
              {conversation.assigned_to && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={assignMutation.isPending}
                  onClick={() =>
                    void run(
                      () => assignMutation.mutateAsync(null),
                      'Nao foi possivel remover o responsavel.',
                    )
                  }
                >
                  Remover responsavel
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {canUpdate && (
        <div className="flex gap-2">
          {isOpen ? (
            <Button
              size="sm"
              variant="secondary"
              loading={closeMutation.isPending}
              disabled={closeMutation.isPending}
              onClick={() =>
                void run(() => closeMutation.mutateAsync(), 'Nao foi possivel encerrar a conversa.')
              }
            >
              Encerrar conversa
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={reopenMutation.isPending}
              disabled={reopenMutation.isPending}
              onClick={() =>
                void run(() => reopenMutation.mutateAsync(), 'Nao foi possivel reabrir a conversa.')
              }
            >
              Reabrir conversa
            </Button>
          )}
        </div>
      )}

      <Card title="Mensagens">
        <div className="flex flex-col gap-3">
          {messagesQuery.hasNextPage && (
            <Button
              size="sm"
              variant="secondary"
              loading={messagesQuery.isFetchingNextPage}
              disabled={messagesQuery.isFetchingNextPage}
              onClick={() => void messagesQuery.fetchNextPage()}
            >
              Carregar anteriores
            </Button>
          )}

          {messagesQuery.isPending && (
            <p className="flex items-center gap-2 text-neutral-600">
              <Spinner size="sm" /> Carregando mensagens...
            </p>
          )}

          {messagesQuery.isError && (
            <Alert tone="danger" title="Nao foi possivel carregar as mensagens">
              <Button size="sm" variant="secondary" onClick={() => void messagesQuery.refetch()}>
                Tentar novamente
              </Button>
            </Alert>
          )}

          {!messagesQuery.isPending && !messagesQuery.isError && messages.length === 0 && (
            <EmptyState
              title="Nenhuma mensagem"
              description="Registre a primeira mensagem desta conversa."
            />
          )}

          {messages.length > 0 && (
            <ul className="flex flex-col gap-2">
              {messages.map((message) => (
                <li key={message.id} className="border-border-subtle rounded-lg border p-3">
                  <p className="text-xs text-neutral-500">
                    {message.direction ? DIRECTION_LABELS[message.direction] : 'Interna'}
                    {' · '}
                    {message.sender_user_id === user?.id ? 'Voce' : 'Atendente'}
                    {' · '}
                    {new Date(message.created_at).toLocaleString('pt-BR')}
                  </p>
                  <p className="whitespace-pre-wrap text-neutral-800">{message.content}</p>
                </li>
              ))}
            </ul>
          )}

          {canUpdate &&
            (isOpen ? (
              <MessageComposer conversationId={conversationId} />
            ) : (
              <Alert tone="info">
                Conversa encerrada. Reabra-a para registrar novas mensagens.
              </Alert>
            ))}
        </div>
      </Card>
    </div>
  );
}
