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
  const users = // D-089: diretorio de colegas (so nomes).
    useExceptionUsersQuery(canManage);
  const createMutation = useCreateAccessException();
  const revokeMutation = useRevokeAccessException();

  const userNames = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user.name])),
    [users.data],
  );

  if (!canManage) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Liberações de acesso
        </h1>
        <Alert tone="warning" title="Acesso restrito">
          Você não tem permissão para gerenciar liberações de acesso.
        </Alert>
      </div>
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!userId) return setFormError('Escolha o usuário.');
    if (!reason.trim()) return setFormError('Informe o motivo da liberação.');
    const expires = new Date(expiresAt);
    if (!expiresAt || Number.isNaN(expires.getTime())) {
      return setFormError('Informe até quando a liberação vale.');
    }
    if (expires.getTime() <= Date.now()) {
      return setFormError('A expiração deve estar no futuro.');
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
      setNotice('Liberação concedida. Vale a partir de agora até a expiração informada.');
    } catch (err) {
      setFormError(accessControlErrorMessage(err, 'Não foi possível conceder a liberação.'));
    }
  }

  async function handleRevoke(id: string) {
    setActionError(null);
    setNotice(null);
    try {
      await revokeMutation.mutateAsync(id);
      setNotice('Liberação revogada. As demais liberações do usuário continuam valendo.');
    } catch (err) {
      setActionError(accessControlErrorMessage(err, 'Não foi possível revogar a liberação.'));
    }
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Liberações de acesso
        </h1>
        <p className="text-sm text-neutral-500">
          Libere, fora do horário de funcionamento, o acesso de um vendedor a Leads, Conversas ou
          ambos. A liberação começa na hora, exige motivo e uma data de expiração, e pode ser
          revogada antes do prazo. Várias liberações podem valer ao mesmo tempo.
        </p>
      </header>

      <Card title="Conceder liberação">
        <form onSubmit={(event) => void handleCreate(event)} className="flex flex-col gap-3">
          {formError && (
            <Alert tone="danger" title="Não foi possível conceder">
              {formError}
            </Alert>
          )}
          {notice && <Alert tone="success">{notice}</Alert>}

          <Select
            label="Usuário"
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
            label="Vale até"
            type="datetime-local"
            required
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            hint="Obrigatório e no futuro. Não há limite máximo de duração."
          />

          <div>
            <Button
              writes
              type="submit"
              size="sm"
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Conceder liberação
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
        <Alert tone="danger" title="Não foi possível concluir">
          {actionError}
        </Alert>
      )}

      {list.isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando liberações...
        </p>
      )}

      {list.isError && (
        <Alert tone="danger" title="Não foi possível carregar as liberações">
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
          title="Nenhuma liberação encontrada"
          description="Conceda uma liberação acima ou ajuste o filtro."
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
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium text-neutral-900">
                          {userNames.get(item.user_id) ?? 'Usuário'} · {SCOPE_LABELS[item.scope]}
                        </p>
                        {/* Motivo livre (ate 1.000 caracteres): sem espacos nao quebraria e estouraria a largura. */}
                        <p className="wrap-anywhere text-sm text-neutral-700">{item.reason}</p>
                        <p className="text-xs text-neutral-500">
                          {formatDateTime(item.starts_at)} até {formatDateTime(item.expires_at)} ·{' '}
                          <span data-testid={`status-${item.id}`}>
                            {exceptionStatusLabel(item)}
                          </span>
                          {item.revoked_at && ` em ${formatDateTime(item.revoked_at)}`}
                        </p>
                      </div>
                      {active && (
                        <Button
                          writes
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
              Página {list.data.page} de {totalPages} · {list.data.total} liberação(ões)
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
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
