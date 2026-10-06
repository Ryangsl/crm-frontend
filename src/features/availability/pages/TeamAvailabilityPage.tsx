import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import {
  useAvailabilityListQuery,
  useMyAvailabilityQuery,
  useSetUserAvailability,
} from '../hooks/useAvailability';
import { ALL_STATUSES, formatSince, STATUS_LABELS } from '../lib/labels';
import type { AvailabilityListItem, AvailabilityStatus } from '../types/availability';

const PAGE_SIZE = 20;

function manageError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AVAILABILITY_DISABLED') {
      return 'A disponibilidade foi desabilitada para esta empresa.';
    }
    if (error.code === 'AVAILABILITY_USER_INACTIVE') return 'O usuario esta inativo.';
    if (error.status === 403) return 'Voce nao tem permissao para esta acao.';
    if (error.status === 404) return 'Usuario nao encontrado.';
  }
  return 'Nao foi possivel concluir a acao.';
}

// Painel de gestao da disponibilidade da equipe (F4.2). `availability:read` ve; so
// `availability:manage` (Admin/Gerente) coloca/retira de Treinamento — nunca altera os demais
// estados de terceiros (D-071/VN-17.2). UX apenas: o backend valida tudo.
export function TeamAvailabilityPage() {
  const { user, hasPermission } = useAuth();
  const canRead = hasPermission('availability:read');
  const canManage = hasPermission('availability:manage');

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AvailabilityStatus | ''>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const me = useMyAvailabilityQuery(canRead);
  const enabled = me.data?.enabled === true;
  const list = useAvailabilityListQuery(
    { page, limit: PAGE_SIZE, status: status || undefined },
    canRead && enabled,
  );
  const mutation = useSetUserAvailability();

  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-neutral-900">Disponibilidade da equipe</h1>
        <Alert tone="warning" title="Acesso restrito">
          Voce nao tem permissao para acessar a disponibilidade da equipe.
        </Alert>
      </div>
    );
  }

  async function act(
    item: AvailabilityListItem,
    target: Extract<AvailabilityStatus, 'training' | 'unavailable'>,
  ) {
    setActionError(null);
    try {
      await mutation.mutateAsync({ userId: item.user_id, status: target });
    } catch (err) {
      setActionError(manageError(err));
    }
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Disponibilidade da equipe</h1>
        <p className="text-sm text-neutral-500">
          Estado atual de cada usuario ativo. So quem esta Disponivel recebe distribuicao automatica
          (quando aplicada). Quem nunca alterou o estado aparece como Indisponivel.
        </p>
      </header>

      {me.isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando...
        </p>
      )}

      {me.isError && (
        <Alert tone="danger" title="Nao foi possivel carregar">
          <p>Nao foi possivel verificar a disponibilidade da empresa.</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void me.refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}

      {me.data && !enabled && (
        <Alert tone="info">
          A disponibilidade nao esta habilitada para esta empresa. Peca a um administrador para
          habilita-la; os estados ja registrados sao preservados.
        </Alert>
      )}

      {enabled && (
        <>
          <div className="max-w-xs">
            <Select
              label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as AvailabilityStatus | '');
              }}
            >
              <option value="">Todos</option>
              {ALL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          {actionError && (
            <Alert tone="danger" title="Nao foi possivel concluir">
              {actionError}
            </Alert>
          )}

          {list.isPending && (
            <p className="flex items-center gap-2 text-neutral-600">
              <Spinner size="sm" /> Carregando equipe...
            </p>
          )}

          {list.isError && (
            <Alert tone="danger" title="Nao foi possivel carregar a equipe">
              <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
                Tentar novamente
              </Button>
            </Alert>
          )}

          {list.data && list.data.data.length === 0 && (
            <EmptyState
              title="Nenhum usuario encontrado"
              description="Ajuste o filtro de estado."
            />
          )}

          {list.data && list.data.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {list.data.data.map((item) => {
                const isSelf = item.user_id === user?.id;
                return (
                  <li key={item.user_id}>
                    <Card>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-neutral-900">{item.name}</p>
                          <p className="text-xs text-neutral-500">
                            <span data-testid={`status-${item.user_id}`}>
                              {STATUS_LABELS[item.status]}
                            </span>{' '}
                            · desde {formatSince(item.since)}
                          </p>
                        </div>
                        {canManage && !isSelf && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={mutation.isPending}
                            onClick={() =>
                              void act(
                                item,
                                item.status === 'training' ? 'unavailable' : 'training',
                              )
                            }
                          >
                            {item.status === 'training'
                              ? `Retirar ${item.name} do Treinamento`
                              : `Colocar ${item.name} em Treinamento`}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}

          {list.data && list.data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-neutral-600">
                Pagina {page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Proxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
