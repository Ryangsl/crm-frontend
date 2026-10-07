import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { InteractionForm } from './InteractionForm';
import { useDeleteInteraction, useTimelineQuery } from '../hooks/useTimeline';
import type { CrmEntityType, InteractionDirection, TimelineItem } from '../types/interactions';

interface TimelineSectionProps {
  entityType: CrmEntityType;
  entityId: string;
}

const DIRECTION_LABEL: Record<InteractionDirection, string> = {
  inbound: 'Entrada',
  outbound: 'Saida',
};

// F4.4: historico (interacoes + notas) do registro. Mostra SO o que foi registrado nesta
// entidade — o historico de um Lead nao aparece no Cliente. Notas sao somente leitura aqui
// (editadas/excluidas na secao de Notas); interacoes nao tem edicao, so exclusao.
export function TimelineSection({ entityType, entityId }: TimelineSectionProps) {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('interactions:read');
  const canCreate = hasPermission('interactions:create');
  const canDelete = hasPermission('interactions:delete');

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTimelineQuery(entityType, entityId, canRead);
  const deleteMutation = useDeleteInteraction(entityType, entityId);

  const [creating, setCreating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sem leitura nao ha o que mostrar; criar sem poder ver o resultado nao faz sentido aqui.
  if (!canRead) return null;

  const items: TimelineItem[] = data?.pages.flatMap((page) => page.data) ?? [];

  async function handleDelete(item: TimelineItem) {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(item.id);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'Nao foi possivel excluir a interacao.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Historico</h2>
        {canCreate && !creating && (
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            Registrar interacao
          </Button>
        )}
      </div>

      {creating && (
        <InteractionForm
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}

      {deleteError && (
        <Alert tone="danger" title="Nao foi possivel excluir">
          {deleteError}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando historico...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar o historico">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {!isPending && !isError && items.length === 0 && !creating && (
        <EmptyState
          title="Nenhum registro no historico"
          description="Interacoes e notas deste registro aparecem aqui."
        />
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="border-border-subtle rounded-lg border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-neutral-700">
                    <span>{item.type === 'note' ? 'Nota' : 'Interacao'}</span>
                    {item.channel && <span className="text-neutral-500">· {item.channel}</span>}
                    {item.direction && (
                      <span className="text-neutral-500">· {DIRECTION_LABEL[item.direction]}</span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap text-neutral-800">{item.summary}</p>
                  {item.outcome && (
                    <p className="mt-1 text-sm text-neutral-600">Resultado: {item.outcome}</p>
                  )}
                  <p className="mt-1 text-sm text-neutral-500">
                    {new Date(item.occurred_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                {item.type === 'interaction' && canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={deleteMutation.isPending && deleteMutation.variables === item.id}
                    onClick={() => void handleDelete(item)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div>
          <Button
            size="sm"
            variant="secondary"
            loading={isFetchingNextPage}
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
