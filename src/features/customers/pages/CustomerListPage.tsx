import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useCustomersQuery } from '../hooks/useCustomers';

const PAGE_SIZE = 20;

export function CustomerListPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const { data, isPending, isError, error, isFetching, refetch } = useCustomersQuery({
    page,
    limit: PAGE_SIZE,
    q: q || undefined,
  });

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Clientes</h1>
          <p className="text-sm text-neutral-500">Cadastro de clientes do tenant.</p>
        </div>
        {hasPermission('customers:create') && (
          <Button onClick={() => navigate('/customers/new')}>Novo cliente</Button>
        )}
      </header>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Nome, documento, telefone ou e-mail"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="self-end">
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
      </form>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando clientes...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar os clientes">
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
          title={q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={q ? 'Tente outro termo de busca.' : 'Comece cadastrando o primeiro cliente.'}
          action={
            hasPermission('customers:create') && !q ? (
              <Button size="sm" onClick={() => navigate('/customers/new')}>
                Novo cliente
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2" aria-busy={isFetching || undefined}>
            {data.data.map((customer) => (
              <li key={customer.id}>
                <Card>
                  <Link to={`/customers/${customer.id}`} className="flex flex-col gap-1">
                    <span className="font-medium text-neutral-900">{customer.name}</span>
                    <span className="text-sm text-neutral-500">
                      {[customer.document, customer.primary_phone, customer.primary_email]
                        .filter(Boolean)
                        .join(' · ') || 'Sem dados de contato'}
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Pagina {data.page} de {totalPages} · {data.total} cliente(s)
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
