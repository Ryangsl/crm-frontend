import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useStageHistoryQuery } from '../hooks/useOpportunities';
import type { StageHistoryItem } from '../types/opportunity';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function describe(item: StageHistoryItem): string {
  return item.from_stage
    ? `${item.from_stage.name} → ${item.to_stage.name}`
    : `Criada em ${item.to_stage.name}`;
}

// RF-10/BR-10: toda mudança de etapa (criação, movimentação, ganho e perda), com quem, quando e a
// justificativa exigida ao pular etapa (D-032). Somente leitura: o histórico é imutável.
export function StageHistorySection({ opportunityId }: { opportunityId: string }) {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useStageHistoryQuery(opportunityId);
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-neutral-900">Histórico de etapas</h2>

      {isPending && <Spinner size="sm" />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar o histórico de etapas">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && items.length === 0 && <EmptyState title="Nenhuma mudança de etapa registrada" />}

      {items.length > 0 && (
        <ol aria-label="Histórico de etapas" className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-border-subtle rounded-control flex flex-col gap-1 border p-3 text-sm"
            >
              <span className="font-medium break-words text-neutral-900">{describe(item)}</span>
              <span className="text-xs text-neutral-500">
                {item.changed_by.name} · {formatDateTime(item.changed_at)}
              </span>
              {item.justification && (
                <p className="break-words text-neutral-700">
                  <span className="font-medium">Justificativa:</span> {item.justification}
                </p>
              )}
            </li>
          ))}
        </ol>
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
