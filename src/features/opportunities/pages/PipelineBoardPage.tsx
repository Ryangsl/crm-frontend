import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { KanbanBoard } from '../components/KanbanBoard';
import {
  BOARD_LIMIT,
  usePipelineOpportunitiesQuery,
  usePipelinesQuery,
} from '../hooks/useOpportunities';

// Visao comercial por pipeline: Kanban (colunas = etapas, cards = oportunidades).
export function PipelineBoardPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const pipelinesQuery = usePipelinesQuery();
  const [selectedId, setSelectedId] = useState('');

  const pipelines = pipelinesQuery.data?.data ?? [];
  const pipeline =
    pipelines.find((item) => item.id === selectedId) ??
    pipelines.find((item) => item.is_default) ??
    pipelines[0];

  const board = usePipelineOpportunitiesQuery(pipeline?.id);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
          <p className="text-sm text-neutral-500">Acompanhe onde cada negociação está no funil.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {pipelines.length > 1 && (
            <Select
              label="Pipeline"
              value={pipeline?.id ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}
          <Button variant="secondary" onClick={() => navigate('/opportunities')}>
            Ver lista
          </Button>
          {hasPermission('opportunities:create') && (
            <Button onClick={() => navigate('/opportunities/new')}>Nova oportunidade</Button>
          )}
        </div>
      </header>

      {(pipelinesQuery.isPending || (pipeline && board.isPending)) && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando pipeline...
        </p>
      )}

      {(pipelinesQuery.isError || board.isError) && (
        <Alert tone="danger" title="Não foi possível carregar o pipeline">
          Tente novamente em instantes.
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void pipelinesQuery.refetch();
                void board.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {pipelinesQuery.data && pipelines.length === 0 && (
        <EmptyState
          title="Nenhum pipeline cadastrado"
          description="Peça a um administrador para configurar o pipeline comercial."
        />
      )}

      {pipeline && board.data && (
        <>
          {board.data.total > BOARD_LIMIT && (
            <Alert tone="info">
              Exibindo as {BOARD_LIMIT} oportunidades mais recentes de {board.data.total}. Use a
              lista com filtros para ver as demais.
            </Alert>
          )}
          <KanbanBoard pipeline={pipeline} opportunities={board.data.data} />
        </>
      )}
    </div>
  );
}
