import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { OutsideBusinessHoursAlert } from '@/features/access-control/components/OutsideBusinessHoursAlert';
import { isOutsideBusinessHours } from '@/features/access-control/lib/labels';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ConversationStatusBadge } from '../components/ConversationStatusBadge';
import { useConversationsQuery } from '../hooks/useConversations';
import { conversationTitle } from '../lib/labels';
import type { ConversationStatus } from '../types/conversations';

const PAGE_SIZE = 20;

// F4.6: lista simples de conversas do tenant (sem inbox omnichannel, sem canal real, sem tempo
// real). Filtros: estado e "sem responsavel". UX apenas — o backend valida tudo.
export function ConversationListPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('conversations:read');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | ConversationStatus>('');
  const [assignment, setAssignment] = useState<'' | 'unassigned'>('');

  const { data, isPending, isError, error, isFetching, refetch } = useConversationsQuery(
    {
      page,
      limit: PAGE_SIZE,
      status: status || undefined,
      unassigned: assignment === 'unassigned' ? true : undefined,
    },
    canRead,
  );

  if (!canRead) {
    return (
      <Alert tone="warning" title="Sem permissao">
        Voce nao tem permissao para ver conversas.
      </Alert>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Conversas</h1>
        <p className="text-sm text-neutral-500">
          Para abrir uma conversa, use o detalhe do cliente, lead ou oportunidade.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Select
          label="Estado"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as '' | ConversationStatus);
          }}
        >
          <option value="">Todos</option>
          <option value="open">Abertas</option>
          <option value="closed">Encerradas</option>
        </Select>
        <Select
          label="Responsavel"
          value={assignment}
          onChange={(event) => {
            setPage(1);
            setAssignment(event.target.value as '' | 'unassigned');
          }}
        >
          <option value="">Todos</option>
          <option value="unassigned">Sem responsavel</option>
        </Select>
      </div>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando conversas...
        </p>
      )}

      {isError && isOutsideBusinessHours(error) && <OutsideBusinessHoursAlert />}

      {isError && !isOutsideBusinessHours(error) && (
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
          title="Nenhuma conversa encontrada"
          description="Ajuste os filtros ou abra uma conversa a partir de um cliente, lead ou oportunidade."
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2" aria-busy={isFetching || undefined}>
            {data.data.map((conversation) => (
              <li key={conversation.id}>
                <Card>
                  <Link to={`/conversations/${conversation.id}`} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-900">
                        {conversationTitle(conversation)}
                      </span>
                      <ConversationStatusBadge status={conversation.status} />
                    </div>
                    <span className="text-sm text-neutral-600">
                      {conversation.assigned_to ? 'Com responsavel' : 'Sem responsavel'}
                      {' · '}
                      {conversation.last_message_at
                        ? new Date(conversation.last_message_at).toLocaleString('pt-BR')
                        : 'Sem mensagens'}
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Pagina {data.page} de {totalPages} · {data.total} conversa(s)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Proxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
