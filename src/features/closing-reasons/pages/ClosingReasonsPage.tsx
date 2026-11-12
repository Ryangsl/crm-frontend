import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import {
  useClosingReasonsQuery,
  useCreateClosingReason,
  useDeleteClosingReason,
  useRenameClosingReason,
} from '../hooks';
import type { ClosingReason, ClosingReasonKind } from '../types';

const LISTS: { kind: ClosingReasonKind; title: string; description: string; example: string }[] = [
  {
    kind: 'opportunity_lost',
    title: 'Motivos de perda',
    description: 'Escolhidos ao marcar uma oportunidade como perdida.',
    example: 'Ex.: Prazo de entrega',
  },
  {
    kind: 'lead_disqualified',
    title: 'Motivos de desqualificação',
    description: 'Escolhidos ao desqualificar um lead.',
    example: 'Ex.: Fora da região atendida',
  },
];

function message(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN') return 'Você não tem permissão para realizar esta ação.';
    if (error.code === 'VALIDATION_ERROR') return 'Informe um nome entre 2 e 80 caracteres.';
    if (error.code === 'CLOSING_REASON_NAME_IN_USE') return 'Já existe um motivo com esse nome.';
    if (error.code === 'CLOSING_REASON_PROTECTED') {
      return 'O motivo "Outro" não pode ser alterado nem excluído.';
    }
    return error.message || fallback;
  }
  return fallback;
}

function validName(name: string): boolean {
  const length = name.trim().length;
  return length >= 2 && length <= 80;
}

type Dialog = { kind: 'rename' | 'delete'; reason: ClosingReason };

// D-099: duas listas separadas por empresa. Todos leem (precisam delas para perder ou
// desqualificar); so quem configura a empresa (`tenant_settings:update`, o Admin) altera.
export function ClosingReasonsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('tenant_settings:update');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Breadcrumb items={[{ label: 'Configurações', to: '/settings' }, { label: 'Motivos' }]} />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Motivos de perda e de desqualificação
        </h1>
        <p className="text-sm text-neutral-500">
          Listas usadas ao perder uma oportunidade e ao desqualificar um lead. O motivo "Outro"
          existe sempre e pede uma justificativa.
        </p>
      </header>

      {!canManage && (
        <Alert tone="info" title="Somente consulta">
          Só o administrador da empresa altera estas listas.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {LISTS.map((list) => (
          <ReasonList
            key={list.kind}
            {...list}
            canManage={canManage}
            onDialog={setDialog}
            onToast={setToast}
          />
        ))}
      </div>

      {dialog?.kind === 'rename' && (
        <RenameModal
          reason={dialog.reason}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setToast('Motivo renomeado.');
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteModal
          reason={dialog.reason}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setToast('Motivo excluído.');
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function ReasonList({
  kind,
  title,
  description,
  example,
  canManage,
  onDialog,
  onToast,
}: (typeof LISTS)[number] & {
  canManage: boolean;
  onDialog: (dialog: Dialog) => void;
  onToast: (text: string) => void;
}) {
  const { data, isPending, isError, refetch } = useClosingReasonsQuery(kind);
  const create = useCreateClosingReason(kind);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validName(name)) {
      setError('Informe um nome entre 2 e 80 caracteres.');
      return;
    }
    try {
      await create.mutateAsync(name.trim());
      setName('');
      onToast('Motivo criado.');
    } catch (err) {
      setError(message(err, 'Não foi possível criar o motivo.'));
    }
  }

  return (
    <Card title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">{description}</p>

        {canManage && (
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => void submit(event)}
            noValidate
          >
            <div className="flex-1">
              <Input
                label={`Novo motivo em ${title.toLowerCase()}`}
                placeholder={example}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={error ?? undefined}
              />
            </div>
            <Button type="submit" loading={create.isPending} disabled={create.isPending} writes>
              <Plus aria-hidden="true" className="size-4" />
              Adicionar
            </Button>
          </form>
        )}

        {isPending && <Spinner />}
        {isError && (
          <Alert tone="danger" title="Não foi possível carregar os motivos">
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        )}
        {data && data.data.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum motivo cadastrado.</p>
        )}
        {data && data.data.length > 0 && (
          <ul aria-label={title} className="divide-border-subtle flex flex-col divide-y">
            {data.data.map((reason) => (
              <li
                key={reason.id}
                className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-medium break-words text-neutral-900">{reason.name}</span>
                  {reason.is_other && <Badge tone="neutral">Exige justificativa</Badge>}
                </span>
                {canManage && !reason.is_other && (
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Renomear ${reason.name}`}
                      onClick={() => onDialog({ kind: 'rename', reason })}
                      writes
                    >
                      Renomear
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Excluir ${reason.name}`}
                      onClick={() => onDialog({ kind: 'delete', reason })}
                      writes
                    >
                      Excluir
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RenameModal({
  reason,
  onClose,
  onDone,
}: {
  reason: ClosingReason;
  onClose: () => void;
  onDone: () => void;
}) {
  const rename = useRenameClosingReason();
  const [name, setName] = useState(reason.name);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (!validName(name)) {
      setError('Informe um nome entre 2 e 80 caracteres.');
      return;
    }
    try {
      await rename.mutateAsync({ id: reason.id, name: name.trim() });
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível renomear o motivo.'));
    }
  }

  return (
    <Modal
      title="Renomear motivo"
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
      <div className="flex flex-col gap-3">
        <Input
          label="Nome do motivo"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error ?? undefined}
        />
        <p className="text-sm text-neutral-500">
          Registros que já usaram este motivo continuam com o nome antigo.
        </p>
      </div>
    </Modal>
  );
}

function DeleteModal({
  reason,
  onClose,
  onDone,
}: {
  reason: ClosingReason;
  onClose: () => void;
  onDone: () => void;
}) {
  const remove = useDeleteClosingReason();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await remove.mutateAsync(reason.id);
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível excluir o motivo.'));
    }
  }

  return (
    <Modal
      title="Excluir motivo"
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
            Excluir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert tone="danger" title="Não foi possível excluir">
            {error}
          </Alert>
        )}
        <p>
          Excluir <strong className="text-neutral-900">{reason.name}</strong>? Ele deixa de aparecer
          para novas escolhas; os registros que já usaram este motivo continuam com ele.
        </p>
      </div>
    </Modal>
  );
}
