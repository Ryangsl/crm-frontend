import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { OutsideBusinessHoursAlert } from '@/features/access-control/components/OutsideBusinessHoursAlert';
import { isOutsideBusinessHours } from '@/features/access-control/lib/labels';
import { Button } from '@/components/ui/Button';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
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
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Conversas</h1>
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
          <Table label="Conversas" busy={isFetching}>
            <Thead>
              <Th>Conversa</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Responsável</Th>
              <Th className="hidden md:table-cell">Última mensagem</Th>
            </Thead>
            <Tbody>
              {data.data.map((conversation) => (
                <Tr key={conversation.id}>
                  <Td className="max-w-72">
                    <Link
                      to={`/conversations/${conversation.id}`}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {conversationTitle(conversation)}
                    </Link>
                  </Td>
                  <Td>
                    <ConversationStatusBadge status={conversation.status} />
                  </Td>
                  <Td className="hidden md:table-cell">
                    {conversation.assigned_to ? 'Com responsavel' : 'Sem responsavel'}
                  </Td>
                  <Td className="hidden whitespace-nowrap md:table-cell">
                    {conversation.last_message_at
                      ? new Date(conversation.last_message_at).toLocaleString('pt-BR')
                      : 'Sem mensagens'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="conversa(s)"
            disabled={isFetching}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
