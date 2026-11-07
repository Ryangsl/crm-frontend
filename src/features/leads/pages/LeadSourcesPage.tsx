import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import {
  useCreateLeadSource,
  useDeleteLeadSource,
  useRenameLeadSource,
} from '../hooks/useLeadMutations';
import { useLeadSourcesQuery } from '../hooks/useLeads';
import type { LeadSource } from '../types/lead';

function message(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN') return 'Você não tem permissão para realizar esta ação.';
    if (error.code === 'VALIDATION_ERROR') return 'Informe um nome com ao menos 2 caracteres.';
    return error.message || fallback;
  }
  return fallback;
}

type Dialog = { kind: 'rename'; source: LeadSource } | { kind: 'delete'; source: LeadSource };

// Origens de Lead (D-094): toda empresa nasce com as origens padrao; o Admin cria, renomeia e
// desativa. Desativar nao muda os leads que ja usam a origem; ela so deixa de aparecer para novos.
export function LeadSourcesPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('lead_sources:read');
  const canCreate = hasPermission('lead_sources:create');
  const canUpdate = hasPermission('lead_sources:update');
  const canDelete = hasPermission('lead_sources:delete');
  const { data, isLoading, isError, refetch } = useLeadSourcesQuery(canRead);
  const create = useCreateLeadSource();
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    if (name.trim().length < 2) {
      setCreateError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    try {
      await create.mutateAsync(name.trim());
      setName('');
      setToast('Origem criada.');
    } catch (error) {
      setCreateError(message(error, 'Não foi possível criar a origem.'));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Breadcrumb
          items={[{ label: 'Configurações', to: '/settings' }, { label: 'Origens de Lead' }]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Origens de Lead</h1>
        <p className="text-sm text-neutral-500">
          De onde vêm os leads da empresa. Todo lead tem uma origem.
        </p>
      </header>

      {!canRead && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver as origens.
        </Alert>
      )}

      {canCreate && (
        <Card className="max-w-xl">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => void submit(e)}
            noValidate
          >
            <div className="flex-1">
              <Input
                label="Nova origem"
                placeholder="Ex.: Feira do setor"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={createError ?? undefined}
              />
            </div>
            <Button type="submit" loading={create.isPending} disabled={create.isPending} writes>
              <Plus aria-hidden="true" className="size-4" />
              Adicionar
            </Button>
          </form>
        </Card>
      )}

      {isLoading && <Spinner />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar as origens">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && data.data.length === 0 && <EmptyState title="Nenhuma origem cadastrada" />}
      {data && data.data.length > 0 && (
        <Table label="Origens de Lead">
          <Thead>
            <Th>Nome</Th>
            {(canUpdate || canDelete) && <Th className="text-right">Ações</Th>}
          </Thead>
          <Tbody>
            {data.data.map((source) => (
              <Tr key={source.id}>
                <Td className="font-medium text-neutral-900">{source.name}</Td>
                {(canUpdate || canDelete) && (
                  <Td className="text-right">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Renomear ${source.name}`}
                          onClick={() => setDialog({ kind: 'rename', source })}
                          writes
                        >
                          Renomear
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Desativar ${source.name}`}
                          onClick={() => setDialog({ kind: 'delete', source })}
                          writes
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {dialog?.kind === 'rename' && (
        <RenameSourceModal
          source={dialog.source}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setToast('Origem renomeada.');
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteSourceModal
          source={dialog.source}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setToast('Origem desativada.');
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function RenameSourceModal({
  source,
  onClose,
  onDone,
}: {
  source: LeadSource;
  onClose: () => void;
  onDone: () => void;
}) {
  const rename = useRenameLeadSource();
  const [name, setName] = useState(source.name);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    try {
      await rename.mutateAsync({ id: source.id, name: name.trim() });
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível renomear a origem.'));
    }
  }

  return (
    <Modal
      title="Renomear origem"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={rename.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirm()}
            loading={rename.isPending}
            disabled={rename.isPending}
            writes
          >
            Salvar
          </Button>
        </>
      }
    >
      <Input
        label="Nome da origem"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={error ?? undefined}
      />
    </Modal>
  );
}

function DeleteSourceModal({
  source,
  onClose,
  onDone,
}: {
  source: LeadSource;
  onClose: () => void;
  onDone: () => void;
}) {
  const remove = useDeleteLeadSource();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await remove.mutateAsync(source.id);
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível desativar a origem.'));
    }
  }

  return (
    <Modal
      title="Desativar origem"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => void confirm()}
            loading={remove.isPending}
            disabled={remove.isPending}
            writes
          >
            Desativar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert tone="danger" title="Não foi possível desativar">
            {error}
          </Alert>
        )}
        <p>
          Desativar <strong className="text-neutral-900">{source.name}</strong>? Ela deixa de
          aparecer para novos leads; os leads que já usam esta origem continuam com ela.
        </p>
      </div>
    </Modal>
  );
}
