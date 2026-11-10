import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { useUserNames } from '@/features/users/hooks/useUsers';
import {
  isLeadImportRunning,
  useInvalidateLeadsOnFinish,
  useLeadImportQuery,
  useLeadImportRowsQuery,
} from '../hooks/useLeadImports';
import { useLeadSourcesQuery } from '../hooks/useLeads';
import {
  failureMessage,
  IMPORT_STATUS,
  ROW_STATUS,
  rowReasonLabel,
} from '../lib/lead-import-labels';
import type { LeadImport, LeadImportRow, LeadImportRowStatus } from '../types/lead-import';

const ROW_FILTERS: { value: '' | LeadImportRowStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'failed', label: 'Com erro' },
  { value: 'created', label: 'Importadas' },
  { value: 'skipped', label: 'Já cadastradas' },
  { value: 'pending', label: 'Pendentes' },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// D-096: andamento de uma importacao (consultado a cada 2 s enquanto roda), contadores, motivo de
// interrupcao e o resultado de cada linha, com link para o Lead criado ou ja existente.
export function LeadImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: record, isPending, isError, error, refetch } = useLeadImportQuery(id);
  const invalidateLeads = useInvalidateLeadsOnFinish();

  // Quando termina, a lista de Leads em cache fica desatualizada.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (!record) return;
    const running = isLeadImportRunning(record);
    if (wasRunning.current && !running) invalidateLeads();
    wasRunning.current = running;
  }, [record, invalidateLeads]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: 'Leads', to: '/leads' },
          { label: 'Importações', to: '/leads/imports' },
          { label: record?.file_name ?? 'Importação' },
        ]}
      />

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando importação...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Não foi possível carregar a importação">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {record && (
        <>
          <header className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-all text-neutral-900">
              {record.file_name}
            </h1>
            <Badge tone={IMPORT_STATUS[record.status].tone}>
              {IMPORT_STATUS[record.status].label}
            </Badge>
          </header>
          <Summary record={record} />
          <Rows record={record} />
        </>
      )}
    </div>
  );
}

function Summary({ record }: { record: LeadImport }) {
  const userNames = useUserNames();
  const { data: sources } = useLeadSourcesQuery();
  const sourceName = sources?.data.find((source) => source.id === record.source_id)?.name;
  const pending = record.total_rows - record.processed_rows;
  const percent = record.total_rows ? (record.processed_rows / record.total_rows) * 100 : 0;

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-700">
            {record.processed_rows} de {record.total_rows} linha(s) processada(s)
          </p>
          <ProgressBar label="Andamento da importação" percent={percent} />
        </div>

        {isLeadImportRunning(record) && (
          <p className="text-sm text-neutral-600" role="status">
            Processando em segundo plano. Você pode sair desta tela; o resultado fica salvo aqui.
          </p>
        )}

        {record.status === 'failed' && (
          <Alert tone="danger" title="Importação interrompida">
            {failureMessage(record.failure_code)} As linhas já processadas continuam valendo.
          </Alert>
        )}

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Counter label="Importadas" value={record.created_count} />
          <Counter label="Já cadastradas" value={record.skipped_count} />
          <Counter label="Com erro" value={record.error_count} />
          <Counter label="Pendentes" value={pending} />
        </dl>

        <dl className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
          <Detail label="Origem" value={sourceName ?? 'Origem'} />
          <Detail
            label="Responsável"
            value={
              record.owner_id
                ? (userNames.get(record.owner_id) ?? 'Responsável fixo')
                : 'Distribuição automática'
            }
          />
          <Detail label="Enviada por" value={record.created_by.name} />
          <Detail label="Enviada em" value={formatDateTime(record.created_at)} />
          {record.finished_at && (
            <Detail label="Encerrada em" value={formatDateTime(record.finished_at)} />
          )}
        </dl>
      </div>
    </Card>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border-subtle rounded-control border p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-xl font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-neutral-500">{label}:</dt>
      <dd className="min-w-0 break-words text-neutral-800">{value}</dd>
    </div>
  );
}

function contactOf(row: LeadImportRow): string {
  return row.data.email ?? row.data.phone ?? row.data.document ?? '—';
}

function Rows({ record }: { record: LeadImport }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | LeadImportRowStatus>(
    record.status === 'completed' && record.error_count > 0 ? 'failed' : '',
  );
  const params = useMemo(
    () => ({ page, status: status || undefined, processed: record.processed_rows }),
    [page, status, record.processed_rows],
  );
  const { data, isPending, isError, isFetching, refetch } = useLeadImportRowsQuery(
    record.id,
    params,
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Card title="Linhas do arquivo">
      <div className="flex flex-col gap-3">
        <div className="max-w-60">
          <Select
            label="Mostrar"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as '' | LeadImportRowStatus);
            }}
          >
            {ROW_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </Select>
        </div>

        {isPending && (
          <p className="flex items-center gap-2 text-neutral-600">
            <Spinner size="sm" /> Carregando linhas...
          </p>
        )}
        {isError && (
          <Alert tone="danger" title="Não foi possível carregar as linhas">
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        )}
        {data && data.data.length === 0 && <EmptyState title="Nenhuma linha neste filtro" />}

        {data && data.data.length > 0 && (
          <>
            <Table label="Linhas da importação" busy={isFetching}>
              <Thead>
                <Th>Linha</Th>
                <Th>Situação</Th>
                <Th>Nome</Th>
                <Th className="hidden md:table-cell">Contato</Th>
                <Th>Detalhe</Th>
              </Thead>
              <Tbody>
                {data.data.map((row) => (
                  <Tr key={row.row}>
                    <Td className="whitespace-nowrap">{row.row}</Td>
                    <Td>
                      <Badge tone={ROW_STATUS[row.status].tone}>
                        {ROW_STATUS[row.status].label}
                      </Badge>
                    </Td>
                    <Td className="max-w-48 truncate">{row.data.name ?? '—'}</Td>
                    <Td className="hidden max-w-56 truncate md:table-cell">{contactOf(row)}</Td>
                    <Td className="min-w-48">
                      <div className="flex flex-col gap-0.5">
                        {row.reason && row.status !== 'created' && (
                          <span className="text-sm text-neutral-700">
                            {rowReasonLabel(row.reason)}
                          </span>
                        )}
                        {row.lead_id && (
                          <Link
                            to={`/leads/${row.lead_id}`}
                            className="text-brand-700 text-sm hover:underline"
                          >
                            {row.status === 'created' ? 'Ver lead criado' : 'Ver lead existente'}
                          </Link>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Pagination
              page={data.page}
              totalPages={totalPages}
              total={data.total}
              noun="linha(s)"
              disabled={isFetching}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </Card>
  );
}
