import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { OutsideBusinessHoursAlert } from '@/features/access-control/components/OutsideBusinessHoursAlert';
import { isOutsideBusinessHours } from '@/features/access-control/lib/labels';
import { Button } from '@/components/ui/Button';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useUserNames } from '@/features/users/hooks/useUsers';
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
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const userNames = useUserNames();

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
    q: q || undefined,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500">Captação e qualificação de leads do tenant.</p>
        </div>
        {hasPermission('leads:create') && (
          <div className="flex flex-wrap gap-2">
            {hasPermission('leads:read') && (
              <Button variant="secondary" onClick={() => navigate('/leads/imports')}>
                Importar
              </Button>
            )}
            <Button writes onClick={() => navigate('/leads/new')}>
              Novo lead
            </Button>
          </div>
        )}
      </header>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQ(searchInput.trim());
        }}
      >
        <div className="min-w-48 flex-1">
          <Input
            label="Buscar"
            placeholder="Nome, documento, telefone ou e-mail"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
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
      </form>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando leads...
        </p>
      )}

      {isError && isOutsideBusinessHours(error) && <OutsideBusinessHoursAlert />}

      {isError && !isOutsideBusinessHours(error) && (
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
              <Button writes size="sm" onClick={() => navigate('/leads/new')}>
                Novo lead
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table label="Leads" busy={isFetching}>
            <Thead>
              <Th>Nome</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Origem</Th>
              <Th className="hidden lg:table-cell">Responsável</Th>
              <Th className="hidden xl:table-cell">Contato</Th>
              <Th className="hidden md:table-cell">Criado em</Th>
            </Thead>
            <Tbody>
              {data.data.map((lead) => (
                <Tr key={lead.id}>
                  <Td className="max-w-56">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {lead.name || 'Lead sem nome'}
                    </Link>
                  </Td>
                  <Td>
                    <LeadStatusBadge status={lead.status} />
                  </Td>
                  <Td className="hidden md:table-cell">
                    {sourceNames.get(lead.source_id) ?? 'Origem'}
                  </Td>
                  <Td className="hidden lg:table-cell">
                    {lead.owner_id
                      ? (userNames.get(lead.owner_id) ?? 'Com responsável')
                      : 'Sem responsável'}
                  </Td>
                  <Td className="hidden max-w-56 truncate xl:table-cell">
                    {lead.email ?? lead.phone ?? '—'}
                  </Td>
                  <Td className="hidden whitespace-nowrap md:table-cell">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="lead(s)"
            disabled={isFetching}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
