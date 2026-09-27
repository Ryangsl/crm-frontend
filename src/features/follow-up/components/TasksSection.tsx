import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { TaskForm } from './TaskForm';
import { useDeleteTask, useTasksQuery, useUpdateTask } from '../hooks/useTasks';
import type { CrmEntityType, Task } from '../types/followUp';

interface TasksSectionProps {
  entityType: CrmEntityType;
  entityId: string;
}

const STATUS_LABEL: Record<Task['status'], string> = {
  pending: 'Pendente',
  done: 'Concluida',
  overdue: 'Atrasada',
};

// D-031: tarefas sao vinculadas a uma entidade do CRM (entity_type + entity_id) quando
// criadas a partir do detalhe de Customer/Lead/Opportunity.
export function TasksSection({ entityType, entityId }: TasksSectionProps) {
  const { hasPermission } = useAuth();
  const { data: tasks, isPending, isError, error, refetch } = useTasksQuery(entityType, entityId);
  const updateMutation = useUpdateTask(entityType, entityId);
  const deleteMutation = useDeleteTask(entityType, entityId);

  const [mode, setMode] = useState<{ kind: 'create' } | { kind: 'edit'; task: Task } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = hasPermission('tasks:create');
  const canEdit = hasPermission('tasks:update');
  const canDelete = hasPermission('tasks:delete');

  async function toggleStatus(task: Task) {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        taskId: task.id,
        input: { status: task.status === 'done' ? 'pending' : 'done' },
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Nao foi possivel atualizar a tarefa.');
    }
  }

  async function handleDelete(task: Task) {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(task.id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Nao foi possivel excluir a tarefa.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Tarefas</h2>
        {canCreate && mode === null && (
          <Button size="sm" variant="secondary" onClick={() => setMode({ kind: 'create' })}>
            Adicionar tarefa
          </Button>
        )}
      </div>

      {mode?.kind === 'create' && (
        <TaskForm
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}

      {actionError && (
        <Alert tone="danger" title="Nao foi possivel completar a acao">
          {actionError}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando tarefas...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar as tarefas">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {tasks && tasks.length === 0 && mode === null && (
        <EmptyState title="Nenhuma tarefa registrada" description="Adicione a primeira tarefa deste registro." />
      )}

      {tasks && tasks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id} className="border-border-subtle rounded-lg border p-3">
              {mode?.kind === 'edit' && mode.task.id === task.id ? (
                <TaskForm
                  entityType={entityType}
                  entityId={entityId}
                  task={task}
                  onSuccess={() => setMode(null)}
                  onCancel={() => setMode(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">{task.title}</p>
                    <p className="text-sm text-neutral-500">
                      Prazo: {new Date(task.due_at).toLocaleString('pt-BR')} ·{' '}
                      {STATUS_LABEL[task.status]}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={updateMutation.isPending}
                        onClick={() => void toggleStatus(task)}
                      >
                        {task.status === 'done' ? 'Reabrir' : 'Concluir'}
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => setMode({ kind: 'edit', task })}>
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleteMutation.isPending}
                        onClick={() => void handleDelete(task)}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
