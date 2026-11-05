import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useUserNames } from '@/features/users/hooks/useUsers';
import { useCustomersQuery } from '../hooks/useCustomers';

const PAGE_SIZE = 20;

export function CustomerListPage() {
  const userNames = useUserNames();
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Clientes</h1>
          <p className="text-sm text-neutral-500">Cadastro de clientes do tenant.</p>
        </div>
        {hasPermission('customers:create') && (
          <Button writes onClick={() => navigate('/customers/new')}>Novo cliente</Button>
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
              <Button writes size="sm" onClick={() => navigate('/customers/new')}>
                Novo cliente
              </Button>
            ) : undefined
          }
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <Table label="Clientes" busy={isFetching}>
            <Thead>
              <Th>Nome</Th>
              <Th className="hidden md:table-cell">Documento</Th>
              <Th className="hidden lg:table-cell">Telefone</Th>
              <Th className="hidden md:table-cell">E-mail</Th>
              <Th className="hidden xl:table-cell">Responsável</Th>
            </Thead>
            <Tbody>
              {data.data.map((customer) => (
                <Tr key={customer.id}>
                  <Td className="max-w-64">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {customer.name}
                    </Link>
                    <span className="block truncate text-xs text-neutral-500 md:hidden">
                      {[customer.document, customer.primary_phone, customer.primary_email]
                        .filter(Boolean)
                        .join(' · ') || 'Sem dados de contato'}
                    </span>
                  </Td>
                  <Td className="hidden md:table-cell">{customer.document ?? '—'}</Td>
                  <Td className="hidden lg:table-cell">{customer.primary_phone ?? '—'}</Td>
                  <Td className="hidden max-w-56 truncate md:table-cell">
                    {customer.primary_email ?? '—'}
                  </Td>
                  <Td className="hidden xl:table-cell">
                    {customer.owner_id ? (userNames.get(customer.owner_id) ?? 'Atribuído') : '—'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="cliente(s)"
            disabled={isFetching}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
