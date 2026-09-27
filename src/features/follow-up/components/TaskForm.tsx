import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/datetime';
import { useCreateTask, useUpdateTask } from '../hooks/useTasks';
import type { CrmEntityType, Task } from '../types/followUp';

interface TaskFormProps {
  entityType: CrmEntityType;
  entityId: string;
  task?: Task;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ entityType, entityId, task, onSuccess, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueAt, setDueAt] = useState(
    task ? toDatetimeLocalValue(task.due_at) : toDatetimeLocalValue(new Date().toISOString()),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateTask(entityType, entityId);
  const updateMutation = useUpdateTask(entityType, entityId);
  const submitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !title.trim() || !dueAt || !user) return;

    setErrorMessage(null);
    try {
      const due_at = fromDatetimeLocalValue(dueAt);
      if (task) {
        await updateMutation.mutateAsync({ taskId: task.id, input: { title: title.trim(), due_at } });
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          assigned_to: user.id,
          due_at,
          entity_type: entityType,
          entity_id: entityId,
        });
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel salvar a tarefa.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {errorMessage}
        </Alert>
      )}

      <Input label="Titulo" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input
        label="Prazo"
        type="datetime-local"
        required
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
          {task ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
