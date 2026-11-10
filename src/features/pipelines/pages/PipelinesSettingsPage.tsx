import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { usePipelinesQuery } from '@/features/opportunities/hooks/useOpportunities';
import type { Pipeline, Stage } from '@/features/opportunities/types/opportunity';
import { ApiError } from '@/services/api';
import {
  useCreatePipeline,
  useCreateStage,
  useDeletePipeline,
  useDeleteStage,
  useReorderStages,
  useUpdatePipeline,
  useUpdateStage,
} from '../hooks/usePipelineMutations';
import { kindFlags, pipelineWarnings, reorderUpdates, sortStages, stageKind } from '../lib/stages';
import type { StageKind } from '../lib/stages';

const KIND_LABEL: Record<StageKind, string> = {
  work: 'Etapa de trabalho',
  won: 'Ganho',
  lost: 'Perdido',
};

function message(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'FORBIDDEN':
        return 'Você não tem permissão para realizar esta ação.';
      case 'VALIDATION_ERROR':
        return 'Informe um nome com ao menos 2 caracteres.';
      case 'PIPELINE_IN_USE':
        return 'Este pipeline tem oportunidades ativas. Mova ou exclua as oportunidades antes de excluí-lo.';
      case 'STAGE_IN_USE':
        return 'Esta etapa tem oportunidades ativas. Mova as oportunidades antes de excluí-la ou de mudar o tipo dela.';
      case 'STAGE_INVALID_FLAGS':
        return 'Uma etapa não pode ser de ganho e de perda ao mesmo tempo.';
      case 'NOT_FOUND':
        return 'Este item não existe mais. Recarregue a página.';
      default:
        return error.message || fallback;
    }
  }
  return fallback;
}

type Dialog =
  | { kind: 'rename-pipeline'; pipeline: Pipeline }
  | { kind: 'delete-pipeline'; pipeline: Pipeline }
  | { kind: 'edit-stage'; pipeline: Pipeline; stage: Stage }
  | { kind: 'delete-stage'; pipeline: Pipeline; stage: Stage };

// RF-09: pipelines e etapas configuraveis por empresa (D-094 deixou a tela para esta etapa). So o
// Admin tem `pipelines:create|update|delete` nos papeis de fabrica; quem decide e o backend
// (409 PIPELINE_IN_USE / STAGE_IN_USE, 422 STAGE_INVALID_FLAGS). Sem regra nova: a tela usa a API
// que ja existe.
export function PipelinesSettingsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('pipelines:read');
  const canCreate = hasPermission('pipelines:create');
  const canUpdate = hasPermission('pipelines:update');
  const canDelete = hasPermission('pipelines:delete');
  const { data, isLoading, isError, refetch } = usePipelinesQuery(canRead);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function done(text: string) {
    setDialog(null);
    setToast(text);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Breadcrumb
          items={[{ label: 'Configurações', to: '/settings' }, { label: 'Pipelines e etapas' }]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Pipelines e etapas
        </h1>
        <p className="text-sm text-neutral-500">
          Os funis de venda da empresa e as etapas pelas quais cada oportunidade passa.
        </p>
      </header>

      {!canRead && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver os pipelines.
        </Alert>
      )}

      {canRead && canCreate && <NewPipelineForm onCreated={() => setToast('Pipeline criado.')} />}

      {isLoading && <Spinner />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar os pipelines">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && data.data.length === 0 && (
        <EmptyState
          title="Nenhum pipeline cadastrado"
          description="Sem pipeline não é possível criar oportunidades."
        />
      )}
      {data?.data.map((pipeline) => (
        <PipelineCard
          key={pipeline.id}
          pipeline={pipeline}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onDialog={setDialog}
          onToast={setToast}
        />
      ))}

      {dialog?.kind === 'rename-pipeline' && (
        <RenamePipelineModal
          pipeline={dialog.pipeline}
          onClose={() => setDialog(null)}
          onDone={() => done('Pipeline renomeado.')}
        />
      )}
      {dialog?.kind === 'delete-pipeline' && (
        <DeletePipelineModal
          pipeline={dialog.pipeline}
          onClose={() => setDialog(null)}
          onDone={() => done('Pipeline excluído.')}
        />
      )}
      {dialog?.kind === 'edit-stage' && (
        <EditStageModal
          pipeline={dialog.pipeline}
          stage={dialog.stage}
          onClose={() => setDialog(null)}
          onDone={() => done('Etapa atualizada.')}
        />
      )}
      {dialog?.kind === 'delete-stage' && (
        <DeleteStageModal
          pipeline={dialog.pipeline}
          stage={dialog.stage}
          onClose={() => setDialog(null)}
          onDone={() => done('Etapa excluída.')}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function NewPipelineForm({ onCreated }: { onCreated: () => void }) {
  const create = useCreatePipeline();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    try {
      await create.mutateAsync({ name: name.trim() });
      setName('');
      onCreated();
    } catch (err) {
      setError(message(err, 'Não foi possível criar o pipeline.'));
    }
  }

  return (
    <Card className="max-w-xl">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <div className="flex-1">
          <Input
            label="Novo pipeline"
            placeholder="Ex.: Vendas corporativas"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={error ?? undefined}
          />
        </div>
        <Button type="submit" loading={create.isPending} disabled={create.isPending} writes>
          <Plus aria-hidden="true" className="size-4" />
          Criar
        </Button>
      </form>
      <p className="mt-2 text-xs text-neutral-500">
        Ele começa sem etapas: adicione as etapas de trabalho, uma de ganho e uma de perda.
      </p>
    </Card>
  );
}

function PipelineCard({
  pipeline,
  canUpdate,
  canDelete,
  onDialog,
  onToast,
}: {
  pipeline: Pipeline;
  canUpdate: boolean;
  canDelete: boolean;
  onDialog: (dialog: Dialog) => void;
  onToast: (text: string) => void;
}) {
  const update = useUpdatePipeline();
  const reorder = useReorderStages();
  const [error, setError] = useState<string | null>(null);
  const stages = sortStages(pipeline.stages);
  const warnings = pipelineWarnings(pipeline);

  async function makeDefault() {
    setError(null);
    try {
      await update.mutateAsync({ id: pipeline.id, input: { is_default: true } });
      onToast('Pipeline padrão alterado.');
    } catch (err) {
      setError(message(err, 'Não foi possível tornar este pipeline o padrão.'));
    }
  }

  async function move(stage: Stage, direction: 'up' | 'down') {
    setError(null);
    const updates = reorderUpdates(stages, stage.id, direction);
    if (updates.length === 0) return;
    try {
      await reorder.mutateAsync({ pipelineId: pipeline.id, updates });
    } catch (err) {
      setError(message(err, 'Não foi possível mudar a ordem das etapas.'));
    }
  }

  return (
    <Card
      title={pipeline.name}
      action={
        <div className="flex flex-wrap items-center justify-end gap-1">
          {pipeline.is_default && <Badge tone="info">Padrão</Badge>}
          {canUpdate && !pipeline.is_default && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Tornar ${pipeline.name} o padrão`}
              loading={update.isPending}
              disabled={update.isPending}
              onClick={() => void makeDefault()}
              writes
            >
              Tornar padrão
            </Button>
          )}
          {canUpdate && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Renomear ${pipeline.name}`}
              onClick={() => onDialog({ kind: 'rename-pipeline', pipeline })}
              writes
            >
              Renomear
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Excluir ${pipeline.name}`}
              onClick={() => onDialog({ kind: 'delete-pipeline', pipeline })}
              writes
            >
              Excluir
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {warnings.map((warning) => (
          <Alert key={warning.key} tone="warning">
            {warning.text}
          </Alert>
        ))}
        {error && (
          <Alert tone="danger" title="Não foi possível concluir">
            {error}
          </Alert>
        )}

        {stages.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma etapa ainda.</p>
        ) : (
          <ol aria-label={`Etapas de ${pipeline.name}`} className="flex flex-col gap-2">
            {stages.map((stage, index) => {
              const kind = stageKind(stage);
              return (
                <li
                  key={stage.id}
                  className="border-border-subtle rounded-control flex flex-col gap-2 border p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500 tabular-nums">{index + 1}.</span>
                    <span className="font-medium break-words text-neutral-900">{stage.name}</span>
                    {kind === 'won' && <Badge tone="success">Ganho</Badge>}
                    {kind === 'lost' && <Badge tone="danger">Perdido</Badge>}
                    {stage.requires_value && <Badge>Exige valor</Badge>}
                  </div>
                  {canUpdate && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Subir ${stage.name}`}
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => void move(stage, 'up')}
                        writes
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Descer ${stage.name}`}
                        disabled={index === stages.length - 1 || reorder.isPending}
                        onClick={() => void move(stage, 'down')}
                        writes
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Editar ${stage.name}`}
                        onClick={() => onDialog({ kind: 'edit-stage', pipeline, stage })}
                        writes
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Excluir etapa ${stage.name}`}
                        onClick={() => onDialog({ kind: 'delete-stage', pipeline, stage })}
                        writes
                      >
                        Excluir
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {canUpdate && (
          <NewStageForm pipeline={pipeline} onCreated={() => onToast('Etapa adicionada.')} />
        )}
      </div>
    </Card>
  );
}

function NewStageForm({ pipeline, onCreated }: { pipeline: Pipeline; onCreated: () => void }) {
  const create = useCreateStage();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<StageKind>('work');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    try {
      await create.mutateAsync({
        pipelineId: pipeline.id,
        input: { name: name.trim(), ...kindFlags(kind) },
      });
      setName('');
      setKind('work');
      onCreated();
    } catch (err) {
      setError(message(err, 'Não foi possível adicionar a etapa.'));
    }
  }

  return (
    <form
      aria-label={`Nova etapa em ${pipeline.name}`}
      className="border-border-subtle flex flex-col gap-2 border-t pt-3"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Nova etapa"
            placeholder="Ex.: Reunião agendada"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={error ?? undefined}
          />
        </div>
        <div className="sm:w-48">
          <Select
            label="Tipo da etapa"
            value={kind}
            onChange={(event) => setKind(event.target.value as StageKind)}
          >
            {(Object.keys(KIND_LABEL) as StageKind[]).map((value) => (
              <option key={value} value={value}>
                {KIND_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="submit"
          variant="secondary"
          loading={create.isPending}
          disabled={create.isPending}
          writes
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar etapa
        </Button>
      </div>
      <p className="text-xs text-neutral-500">
        A etapa entra no fim da lista; use as setas para posicioná-la.
      </p>
    </form>
  );
}

function RenamePipelineModal({
  pipeline,
  onClose,
  onDone,
}: {
  pipeline: Pipeline;
  onClose: () => void;
  onDone: () => void;
}) {
  const update = useUpdatePipeline();
  const [name, setName] = useState(pipeline.name);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    try {
      await update.mutateAsync({ id: pipeline.id, input: { name: name.trim() } });
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível renomear o pipeline.'));
    }
  }

  return (
    <Modal
      title="Renomear pipeline"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirm()}
            loading={update.isPending}
            disabled={update.isPending}
            writes
          >
            Salvar
          </Button>
        </>
      }
    >
      <Input
        label="Nome do pipeline"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={error ?? undefined}
      />
    </Modal>
  );
}

function DeletePipelineModal({
  pipeline,
  onClose,
  onDone,
}: {
  pipeline: Pipeline;
  onClose: () => void;
  onDone: () => void;
}) {
  const remove = useDeletePipeline();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await remove.mutateAsync(pipeline.id);
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível excluir o pipeline.'));
    }
  }

  return (
    <Modal
      title="Excluir pipeline"
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
          Excluir <strong className="text-neutral-900">{pipeline.name}</strong> e as etapas dele? Só
          é possível quando não há oportunidades ativas neste pipeline.
        </p>
        {pipeline.is_default && (
          <Alert tone="warning">
            Este é o pipeline padrão. Depois de excluí-lo, escolha outro como padrão.
          </Alert>
        )}
      </div>
    </Modal>
  );
}

function EditStageModal({
  pipeline,
  stage,
  onClose,
  onDone,
}: {
  pipeline: Pipeline;
  stage: Stage;
  onClose: () => void;
  onDone: () => void;
}) {
  const update = useUpdateStage();
  const [name, setName] = useState(stage.name);
  const [kind, setKind] = useState<StageKind>(stageKind(stage));
  const [requiresValue, setRequiresValue] = useState(stage.requires_value);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    if (name.trim().length < 2) {
      setError('Informe um nome com ao menos 2 caracteres.');
      return;
    }
    // Manda so o que mudou: mudar o tipo de uma etapa com oportunidades e recusado (409).
    const input: { name?: string; is_won?: boolean; is_lost?: boolean; requires_value?: boolean } =
      {};
    if (name.trim() !== stage.name) input.name = name.trim();
    if (kind !== stageKind(stage)) Object.assign(input, kindFlags(kind));
    if (requiresValue !== stage.requires_value) input.requires_value = requiresValue;
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    try {
      await update.mutateAsync({ pipelineId: pipeline.id, stageId: stage.id, input });
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível atualizar a etapa.'));
    }
  }

  return (
    <Modal
      title="Editar etapa"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirm()}
            loading={update.isPending}
            disabled={update.isPending}
            writes
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert tone="danger" title="Não foi possível salvar">
            {error}
          </Alert>
        )}
        <Input
          label="Nome da etapa"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label="Tipo"
          value={kind}
          onChange={(event) => setKind(event.target.value as StageKind)}
        >
          {(Object.keys(KIND_LABEL) as StageKind[]).map((value) => (
            <option key={value} value={value}>
              {KIND_LABEL[value]}
            </option>
          ))}
        </Select>
        <p className="text-xs text-neutral-500">
          Ganhar e perder uma oportunidade levam às etapas desses tipos. Uma etapa com oportunidades
          ativas não muda de tipo.
        </p>
        <label className="min-h-touch flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={requiresValue}
            onChange={(event) => setRequiresValue(event.target.checked)}
          />
          Exige valor da oportunidade nesta etapa
        </label>
      </div>
    </Modal>
  );
}

function DeleteStageModal({
  pipeline,
  stage,
  onClose,
  onDone,
}: {
  pipeline: Pipeline;
  stage: Stage;
  onClose: () => void;
  onDone: () => void;
}) {
  const remove = useDeleteStage();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await remove.mutateAsync({ pipelineId: pipeline.id, stageId: stage.id });
      onDone();
    } catch (err) {
      setError(message(err, 'Não foi possível excluir a etapa.'));
    }
  }

  return (
    <Modal
      title="Excluir etapa"
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
          Excluir a etapa <strong className="text-neutral-900">{stage.name}</strong> de{' '}
          {pipeline.name}? Só é possível quando não há oportunidades ativas nela. O histórico das
          oportunidades que passaram por ela é mantido.
        </p>
      </div>
    </Modal>
  );
}
