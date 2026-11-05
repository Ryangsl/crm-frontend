import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Oportunidades</h1>
          <p className="text-sm text-neutral-500">Negociações em andamento e encerradas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/pipeline')}>
            Ver pipeline
          </Button>
          {hasPermission('opportunities:create') && (
            <Button writes onClick={() => navigate('/opportunities/new')}>Nova oportunidade</Button>
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
              <Button writes size="sm" onClick={() => navigate('/opportunities/new')}>
                Nova oportunidade
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table label="Oportunidades" busy={isFetching}>
            <Thead>
              <Th>Cliente</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Etapa</Th>
              <Th className="hidden sm:table-cell">Valor</Th>
              <Th className="hidden lg:table-cell">Responsável</Th>
            </Thead>
            <Tbody>
              {data.data.map((opportunity) => (
                <Tr key={opportunity.id}>
                  <Td className="max-w-64">
                    <Link
                      to={`/opportunities/${opportunity.id}`}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {opportunity.customer.name}
                    </Link>
                    <span className="block truncate text-xs text-neutral-500 md:hidden">
                      {stageNames.get(opportunity.stage_id) ?? 'Etapa'} ·{' '}
                      {formatMoney(opportunity.value)}
                    </span>
                  </Td>
                  <Td>
                    <OpportunityStatusBadge status={opportunity.status} />
                  </Td>
                  <Td className="hidden md:table-cell">
                    {stageNames.get(opportunity.stage_id) ?? 'Etapa'}
                  </Td>
                  <Td className="hidden whitespace-nowrap tabular-nums sm:table-cell">
                    {formatMoney(opportunity.value)}
                  </Td>
                  <Td className="hidden lg:table-cell">Responsável: {opportunity.owner.name}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="oportunidade(s)"
            disabled={isFetching}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
