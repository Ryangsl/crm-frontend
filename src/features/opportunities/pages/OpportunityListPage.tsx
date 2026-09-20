import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { OpportunityStatusBadge } from '../components/OpportunityStatusBadge';
import { useOpportunitiesQuery, usePipelinesQuery } from '../hooks/useOpportunities';
import { formatMoney } from '../lib/money';

const PAGE_SIZE = 20;

export function OpportunityListPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState('');

  const { data: pipelines } = usePipelinesQuery();
  const stageNames = useMemo(
    () =>
      new Map(
        (pipelines?.data ?? []).flatMap((p) => p.stages).map((stage) => [stage.id, stage.name]),
      ),
    [pipelines],
  );
  const selectedPipeline = pipelines?.data.find((pipeline) => pipeline.id === pipelineId);

  const { data, isPending, isError, error, isFetching, refetch } = useOpportunitiesQuery({
    page,
    limit: PAGE_SIZE,
    pipeline_id: pipelineId || undefined,
    stage_id: stageId || undefined,
    status: status || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Oportunidades</h1>
          <p className="text-sm text-neutral-500">Negociações em andamento e encerradas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/pipeline')}>
            Ver pipeline
          </Button>
          {hasPermission('opportunities:create') && (
            <Button onClick={() => navigate('/opportunities/new')}>Nova oportunidade</Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Select
          label="Pipeline"
          value={pipelineId}
          onChange={(event) => {
            setPage(1);
            setStageId('');
            setPipelineId(event.target.value);
          }}
        >
          <option value="">Todos</option>
          {(pipelines?.data ?? []).map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </Select>
        <Select
          label="Etapa"
          value={stageId}
          disabled={!selectedPipeline}
          onChange={(event) => {
            setPage(1);
            setStageId(event.target.value);
          }}
        >
          <option value="">Todas</option>
          {(selectedPipeline?.stages ?? []).map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">Todos</option>
          <option value="open">Aberta</option>
          <option value="won">Ganha</option>
          <option value="lost">Perdida</option>
        </Select>
      </div>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando oportunidades...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Não foi possível carregar as oportunidades">
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
          title="Nenhuma oportunidade encontrada"
          description="Ajuste os filtros ou cadastre uma nova oportunidade."
          action={
            hasPermission('opportunities:create') ? (
              <Button size="sm" onClick={() => navigate('/opportunities/new')}>
                Nova oportunidade
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2" aria-busy={isFetching || undefined}>
            {data.data.map((opportunity) => (
              <li key={opportunity.id}>
                <Card>
                  <Link to={`/opportunities/${opportunity.id}`} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900">
                        {opportunity.customer.name}
                      </span>
                      <OpportunityStatusBadge status={opportunity.status} />
                    </div>
                    <span className="text-sm text-neutral-600">
                      {stageNames.get(opportunity.stage_id) ?? 'Etapa'} ·{' '}
                      {formatMoney(opportunity.value)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Responsável: {opportunity.owner.name}
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Página {data.page} de {totalPages} · {data.total} oportunidade(s)
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
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
