import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/useAuth';
import {
  useAccessExceptionsQuery,
  useCreateAccessException,
  useExceptionUsersQuery,
  useRevokeAccessException,
} from '../hooks/useAccessControl';
import {
  accessControlErrorMessage,
  exceptionStatusLabel,
  isExceptionActive,
  SCOPE_LABELS,
} from '../lib/labels';
import type { AccessExceptionScope } from '../types/accessControl';

const PAGE_SIZE = 20;
type Filter = '' | 'active' | 'inactive';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

// F4.7 (D-082): liberacoes excepcionais de acesso fora do horario. Admin e Gerente
// (`access_exceptions:manage`) concedem, listam e revogam para qualquer usuario do tenant.
// Concessao direta; inicio imediato; motivo e expiracao (futura, sem teto) obrigatorios. UX
// apenas: o backend valida permissao, tenant e se o usuario e sujeito a restricao.
export function AccessExceptionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('access_exceptions:manage');
  const canListUsers = hasPermission('users:read');

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('');
  const [userId, setUserId] = useState('');
  const [scope, setScope] = useState<AccessExceptionScope>('leads');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useAccessExceptionsQuery(
    {
      page,
      limit: PAGE_SIZE,
      active: filter === 'active' ? true : filter === 'inactive' ? false : undefined,
    },
    canManage,
  );
  const users = useExceptionUsersQuery(canManage && canListUsers);
  const createMutation = useCreateAccessException();
  const revokeMutation = useRevokeAccessException();

  const userNames = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user.name])),
    [users.data],
  );

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-neutral-900">Liberacoes de acesso</h1>
        <Alert tone="warning" title="Acesso restrito">
          Voce nao tem permissao para gerenciar liberacoes de acesso.
        </Alert>
      </div>
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!userId) return setFormError('Escolha o usuario.');
    if (!reason.trim()) return setFormError('Informe o motivo da liberacao.');
    const expires = new Date(expiresAt);
    if (!expiresAt || Number.isNaN(expires.getTime())) {
      return setFormError('Informe ate quando a liberacao vale.');
    }
    if (expires.getTime() <= Date.now()) {
      return setFormError('A expiracao deve estar no futuro.');
    }
    try {
      await createMutation.mutateAsync({
        user_id: userId,
        scope,
        reason: reason.trim(),
        expires_at: expires.toISOString(),
      });
      setReason('');
      setExpiresAt('');
      setNotice('Liberacao concedida. Vale a partir de agora ate a expiracao informada.');
    } catch (err) {
      setFormError(accessControlErrorMessage(err, 'Nao foi possivel conceder a liberacao.'));
    }
  }

  async function handleRevoke(id: string) {
    setActionError(null);
    setNotice(null);
    try {
      await revokeMutation.mutateAsync(id);
      setNotice('Liberacao revogada. As demais liberacoes do usuario continuam valendo.');
    } catch (err) {
      setActionError(accessControlErrorMessage(err, 'Nao foi possivel revogar a liberacao.'));
    }
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Liberacoes de acesso</h1>
        <p className="text-sm text-neutral-500">
          Libere, fora do horario de funcionamento, o acesso de um vendedor a Leads, Conversas ou
          ambos. A liberacao comeca na hora, exige motivo e uma data de expiracao, e pode ser
          revogada antes do prazo. Varias liberacoes podem valer ao mesmo tempo.
        </p>
      </header>

      <Card title="Conceder liberacao">
        <form onSubmit={(event) => void handleCreate(event)} className="flex flex-col gap-3">
          {formError && (
            <Alert tone="danger" title="Nao foi possivel conceder">
              {formError}
            </Alert>
          )}
          {notice && <Alert tone="success">{notice}</Alert>}

          {canListUsers ? (
            <Select
              label="Usuario"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {(users.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Usuario (id)"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            />
          )}

          <Select
            label="Acesso liberado"
            value={scope}
            onChange={(event) => setScope(event.target.value as AccessExceptionScope)}
          >
            {(['leads', 'conversations', 'all'] as const).map((value) => (
              <option key={value} value={value}>
                {SCOPE_LABELS[value]}
              </option>
            ))}
          </Select>

          <Textarea
            label="Motivo"
            required
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <Input
            label="Vale ate"
            type="datetime-local"
            required
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            hint="Obrigatorio e no futuro. Nao ha limite maximo de duracao."
          />

          <div>
            <Button
              type="submit"
              size="sm"
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Conceder liberacao
            </Button>
          </div>
        </form>
      </Card>

      <div className="max-w-xs">
        <Select
          label="Mostrar"
          value={filter}
          onChange={(event) => {
            setPage(1);
            setFilter(event.target.value as Filter);
          }}
        >
          <option value="">Todas</option>
          <option value="active">Vigentes</option>
          <option value="inactive">Revogadas ou expiradas</option>
        </Select>
      </div>

      {actionError && (
        <Alert tone="danger" title="Nao foi possivel concluir">
          {actionError}
        </Alert>
      )}

      {list.isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando liberacoes...
        </p>
      )}

      {list.isError && (
        <Alert tone="danger" title="Nao foi possivel carregar as liberacoes">
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => void list.refetch()}
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      {list.data && list.data.data.length === 0 && (
        <EmptyState
          title="Nenhuma liberacao encontrada"
          description="Conceda uma liberacao acima ou ajuste o filtro."
        />
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {list.data.data.map((item) => {
              const active = isExceptionActive(item);
              return (
                <li key={item.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-neutral-900">
                          {userNames.get(item.user_id) ?? 'Usuario'} · {SCOPE_LABELS[item.scope]}
                        </p>
                        <p className="text-sm text-neutral-700">{item.reason}</p>
                        <p className="text-xs text-neutral-500">
                          {formatDateTime(item.starts_at)} ate {formatDateTime(item.expires_at)} ·{' '}
                          <span data-testid={`status-${item.id}`}>
                            {exceptionStatusLabel(item)}
                          </span>
                          {item.revoked_at && ` em ${formatDateTime(item.revoked_at)}`}
                        </p>
                      </div>
                      {active && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={revokeMutation.isPending}
                          onClick={() => void handleRevoke(item.id)}
                        >
                          Revogar
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              Pagina {list.data.page} de {totalPages} · {list.data.total} liberacao(oes)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || list.isFetching}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages || list.isFetching}
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
