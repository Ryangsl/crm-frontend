import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { LeadStatusBadge } from '../components/LeadStatusBadge';
import { useLeadSourcesQuery, useLeadsQuery } from '../hooks/useLeads';
import type { LeadStatus } from '../types/lead';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Novo' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'disqualified', label: 'Desqualificado' },
  { value: 'converted', label: 'Convertido' },
];

export function LeadListPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [sourceId, setSourceId] = useState('');

  const { data: sources } = useLeadSourcesQuery();
  const sourceNames = useMemo(
    () => new Map((sources?.data ?? []).map((source) => [source.id, source.name])),
    [sources],
  );

  const { data, isPending, isError, error, isFetching, refetch } = useLeadsQuery({
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    source_id: sourceId || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500">Captação e qualificação de leads do tenant.</p>
        </div>
        {hasPermission('leads:create') && (
          <Button onClick={() => navigate('/leads/new')}>Novo lead</Button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="Origem"
          value={sourceId}
          onChange={(event) => {
            setPage(1);
            setSourceId(event.target.value);
          }}
        >
          <option value="">Todas</option>
          {(sources?.data ?? []).map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </Select>
      </div>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando leads...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar os leads">
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
          title="Nenhum lead encontrado"
          description="Ajuste os filtros ou cadastre um novo lead."
          action={
            hasPermission('leads:create') ? (
              <Button size="sm" onClick={() => navigate('/leads/new')}>
                Novo lead
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2" aria-busy={isFetching || undefined}>
            {data.data.map((lead) => (
              <li key={lead.id}>
                <Card>
                  <Link to={`/leads/${lead.id}`} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <span className="text-sm text-neutral-500">
                        {sourceNames.get(lead.source_id) ?? 'Origem'}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-600">
                      {lead.owner_id ? 'Com responsável' : 'Sem responsável'}
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Pagina {data.page} de {totalPages} · {data.total} lead(s)
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
