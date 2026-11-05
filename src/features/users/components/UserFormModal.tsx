import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import type { TenantRole, TenantUser } from '../hooks/useUsers';
import { grantBlockReason, isFactoryAdminRole, userErrorMessage } from '../lib/access';
import type { Grantor } from '../lib/access';

interface UserFormModalProps {
  // Sem `user`: criacao.
  user?: TenantUser;
  roles: TenantRole[] | undefined;
  rolesLoading: boolean;
  canReadRoles: boolean;
  me: Grantor;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const MIN_PASSWORD = 8;

// Papel de fabrica primeiro (Admin no topo), depois os personalizados, por nome.
function sortRoles(roles: TenantRole[]): TenantRole[] {
  return [...roles].sort((a, b) => {
    if (isFactoryAdminRole(a) !== isFactoryAdminRole(b)) return isFactoryAdminRole(a) ? -1 : 1;
    if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((item) => b.has(item));
}

export function UserFormModal({
  user,
  roles,
  rolesLoading,
  canReadRoles,
  me,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const editing = Boolean(user);
  const formId = useId();
  const initialRoles = new Set(user?.role_ids ?? []);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<Set<string>>(initialRoles);
  const [error, setError] = useState<string | null>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const saving = createUser.isPending || updateUser.isPending;

  function toggleRole(id: string) {
    setRoleIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    try {
      if (user) {
        const trimmed = name.trim();
        await updateUser.mutateAsync({
          id: user.id,
          input: {
            ...(trimmed !== user.name ? { name: trimmed } : {}),
            ...(!sameSet(roleIds, initialRoles) ? { role_ids: [...roleIds] } : {}),
          },
        });
        onSaved('Usuário atualizado.');
      } else {
        await createUser.mutateAsync({
          name: name.trim(),
          email: email.trim(),
          password,
          role_ids: [...roleIds],
        });
        onSaved('Usuário criado.');
      }
    } catch (err) {
      setError(userErrorMessage(err, 'Não foi possível salvar o usuário.'));
    }
  }

  return (
    <Modal
      title={editing ? 'Editar usuário' : 'Novo usuário'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving} disabled={saving} writes>
            {editing ? 'Salvar' : 'Criar usuário'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        {error && (
          <Alert tone="danger" title="Não foi possível salvar">
            {error}
          </Alert>
        )}
        <Input
          label="Nome"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {user ? (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-800">E-mail</span>
            <span className="text-sm text-neutral-700">{user.email}</span>
            <span className="text-xs text-neutral-500">O e-mail não pode ser alterado.</span>
          </div>
        ) : (
          <>
            <Input
              label="E-mail"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Senha inicial"
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              hint={`Ao menos ${MIN_PASSWORD} caracteres. Entregue à pessoa por um canal seguro.`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-neutral-800">Papéis</legend>
          {!canReadRoles && (
            <p className="text-sm text-neutral-500">
              Você não tem permissão para ver os papéis. O usuário fica com os papéis atuais.
            </p>
          )}
          {canReadRoles && rolesLoading && <Spinner />}
          {canReadRoles &&
            roles &&
            sortRoles(roles).map((role) => {
              const checked = roleIds.has(role.id);
              const blocked = grantBlockReason(role, me);
              // Concessao e retirada seguem a mesma regra: o que esta bloqueado fica como esta.
              const disabled = Boolean(blocked) && checked === initialRoles.has(role.id);
              const hintId = `${formId}-${role.id}-hint`;
              return (
                <label
                  key={role.id}
                  className={`border-border-subtle rounded-control flex items-start gap-3 border p-3 ${
                    disabled ? 'opacity-70' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={disabled}
                    aria-describedby={blocked ? hintId : undefined}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900 capitalize">{role.name}</span>
                      <Badge tone={role.is_system ? 'info' : 'neutral'}>
                        {role.is_system ? 'Padrão' : 'Personalizado'}
                      </Badge>
                    </span>
                    <span className="text-xs text-neutral-500">
                      {role.permissions.length} permissões
                    </span>
                    {blocked && (
                      <span id={hintId} className="text-xs text-neutral-500">
                        {blocked}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
        </fieldset>
      </form>
    </Modal>
  );
}
