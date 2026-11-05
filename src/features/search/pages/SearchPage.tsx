import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { listCustomers } from '@/features/customers/services/customers';
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge';
import { listLeads } from '@/features/leads/services/leads';

const LIMIT = 10;

// Busca geral: usa as buscas que Clientes e Leads ja tem, cada uma com a propria permissao.
export function SearchPage() {
  const { hasPermission } = useAuth();
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const canCustomers = hasPermission('customers:read');
  const canLeads = hasPermission('leads:read');

  const customers = useQuery({
    queryKey: ['search', 'customers', q],
    queryFn: () => listCustomers({ q, page: 1, limit: LIMIT }),
    enabled: canCustomers && q.length > 0,
  });
  const leads = useQuery({
    queryKey: ['search', 'leads', q],
    queryFn: () => listLeads({ q, page: 1, limit: LIMIT }),
    enabled: canLeads && q.length > 0,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Busca</h1>
        <p className="text-sm text-neutral-500">
          {q ? `Resultados para "${q}"` : 'Digite um termo na barra de busca.'}
        </p>
      </header>

      {q && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canCustomers && (
            <Card title="Clientes">
              {customers.isLoading && <Spinner />}
              {customers.isError && <Alert tone="danger">Não foi possível buscar clientes.</Alert>}
              {customers.data && customers.data.data.length === 0 && (
                <EmptyState title="Nenhum cliente encontrado" />
              )}
              <ul className="divide-border-subtle divide-y">
                {customers.data?.data.map((customer) => (
                  <li key={customer.id} className="py-2.5">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">
                      {customer.primary_email ?? customer.primary_phone ?? customer.document ?? ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {canLeads && (
            <Card title="Leads">
              {leads.isLoading && <Spinner />}
              {leads.isError && <Alert tone="warning">Leads indisponíveis agora.</Alert>}
              {leads.data && leads.data.data.length === 0 && (
                <EmptyState title="Nenhum lead encontrado" />
              )}
              <ul className="divide-border-subtle divide-y">
                {leads.data?.data.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {lead.name || 'Lead sem nome'}
                      </Link>
                      <p className="truncate text-xs text-neutral-500">
                        {lead.email ?? lead.phone ?? ''}
                      </p>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!canCustomers && !canLeads && (
            <Alert tone="warning" title="Sem permissão">
              Você não tem permissão para buscar clientes nem leads.
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
