import { UserPlus } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { DeactivateUserModal } from '../components/DeactivateUserModal';
import { UserFormModal } from '../components/UserFormModal';
import { useRolesQuery, useUsersQuery } from '../hooks/useUsers';
import type { TenantUser } from '../hooks/useUsers';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: TenantUser }
  | { kind: 'details'; user: TenantUser }
  | { kind: 'deactivate'; user: TenantUser };

function rolesText(user: TenantUser): string {
  return user.roles?.length ? user.roles.join(', ') : 'Sem papel';
}

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Gestao de usuarios da empresa (D-087). As acoes aparecem conforme as permissoes de quem esta
// logado, mas quem decide e o backend: conceder papel acima do proprio acesso, mexer em um Admin sem
// ser Admin ou deixar a empresa sem Admin ativo sao recusados la, com a mensagem mostrada aqui.
export function UsersPage() {
  const { user: me, hasPermission } = useAuth();
  const canRead = hasPermission('users:read');
  const canCreate = hasPermission('users:create');
  const canUpdate = hasPermission('users:update');
  const canDelete = hasPermission('users:delete');
  const canReadRoles = hasPermission('roles:read');

  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { data, isLoading, isError, isFetching, refetch } = useUsersQuery(page, canRead);
  const roles = useRolesQuery(canReadRoles && (canCreate || canUpdate));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const grantor = { permissions: me?.permissions ?? [], roles: me?.roles ?? [] };

  function finish(message: string) {
    setDialog(null);
    setToast(message);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[{ label: 'Configurações', to: '/settings' }, { label: 'Usuários' }]}
          />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Usuários</h1>
          <p className="text-sm text-neutral-500">Pessoas com acesso ao CRM nesta empresa.</p>
        </div>
        {canRead && canCreate && (
          <Button onClick={() => setDialog({ kind: 'create' })} writes>
            <UserPlus aria-hidden="true" className="size-4" />
            Novo usuário
          </Button>
        )}
      </header>

      {!canRead && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver os usuários.
        </Alert>
      )}
      {isLoading && <Spinner />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar os usuários">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && data.data.length === 0 && <EmptyState title="Nenhum usuário encontrado" />}
      {data && data.data.length > 0 && (
        <>
          <Table label="Usuários" busy={isFetching}>
            <Thead>
              <Th>Nome</Th>
              <Th className="hidden md:table-cell">E-mail</Th>
              <Th className="hidden lg:table-cell">Papéis</Th>
              <Th className="hidden sm:table-cell">Situação</Th>
              {(canUpdate || canDelete) && <Th className="text-right">Ações</Th>}
            </Thead>
            <Tbody>
              {data.data.map((user) => {
                const isSelf = user.id === me?.id;
                const active = user.status === 'active';
                return (
                  <Tr key={user.id}>
                    <Td className="font-medium text-neutral-900">
                      <button
                        type="button"
                        className="text-brand-700 text-left hover:underline"
                        onClick={() => setDialog({ kind: 'details', user })}
                      >
                        {user.name}
                      </button>
                      {isSelf && <span className="ml-1 text-xs text-neutral-500">(você)</span>}
                      <span className="block text-xs font-normal break-all text-neutral-500 md:hidden">
                        {user.email}
                      </span>
                      <span className="block text-xs font-normal text-neutral-500 capitalize lg:hidden">
                        {rolesText(user)}
                      </span>
                      {/* No celular a situacao fica aqui, e a coluna some. */}
                      <span className="mt-1 block sm:hidden">
                        <Badge tone={active ? 'success' : 'neutral'}>
                          {active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </span>
                    </Td>
                    <Td className="hidden md:table-cell">{user.email}</Td>
                    <Td className="hidden capitalize lg:table-cell">{rolesText(user)}</Td>
                    <Td className="hidden sm:table-cell">
                      <Badge tone={active ? 'success' : 'neutral'}>
                        {active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Td>
                    {(canUpdate || canDelete) && (
                      <Td className="text-right">
                        {/* Empilhadas no celular para caber sem rolagem dentro da tabela. */}
                        <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Editar ${user.name}`}
                              onClick={() => setDialog({ kind: 'edit', user })}
                              writes
                            >
                              Editar
                            </Button>
                          )}
                          {/* Um Admin so e desativado por outro Admin (D-087): sem o botao na propria linha. */}
                          {canDelete && active && !(isSelf && user.roles?.includes('admin')) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Desativar ${user.name}`}
                              onClick={() => setDialog({ kind: 'deactivate', user })}
                              writes
                            >
                              Desativar
                            </Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="usuário(s)"
            disabled={isFetching}
            onChange={setPage}
          />
        </>
      )}

      {dialog?.kind === 'details' && (
        <Modal title={dialog.user.name} onClose={() => setDialog(null)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-neutral-500">E-mail</dt>
            <dd className="break-all text-neutral-900">{dialog.user.email}</dd>
            <dt className="text-neutral-500">Situação</dt>
            <dd className="text-neutral-900">
              {dialog.user.status === 'active' ? 'Ativo' : 'Inativo'}
            </dd>
            <dt className="text-neutral-500">Papéis</dt>
            <dd className="text-neutral-900 capitalize">{rolesText(dialog.user)}</dd>
            <dt className="text-neutral-500">Criado em</dt>
            <dd className="text-neutral-900">{formatDate(dialog.user.created_at)}</dd>
          </dl>
          {dialog.user.status !== 'active' && (
            <p className="mt-3 text-neutral-500">
              Usuário desativado. A reativação ainda não está disponível no CRM.
            </p>
          )}
        </Modal>
      )}
      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <UserFormModal
          user={dialog.kind === 'edit' ? dialog.user : undefined}
          roles={roles.data}
          rolesLoading={roles.isLoading}
          canReadRoles={canReadRoles}
          me={grantor}
          onClose={() => setDialog(null)}
          onSaved={finish}
        />
      )}
      {dialog?.kind === 'deactivate' && (
        <DeactivateUserModal
          user={dialog.user}
          isSelf={dialog.user.id === me?.id}
          onClose={() => setDialog(null)}
          onDone={finish}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
