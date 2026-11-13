import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/features/auth/useAuth';
import { isPermissionDenied } from '@/features/plan/lib/labels';
import { useUserDirectory } from '@/features/users/hooks/useUsers';
import { ApiError } from '@/services/api';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/datetime';
import { useCreateTask, useUpdateTask } from '../hooks/useTasks';
import type { CrmEntityType, Task } from '../types/followUp';

// Prazo sugerido: 9h do dia seguinte. "Agora" faria a tarefa nascer atrasada.
function nextMorning(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

interface TaskFormProps {
  // Sem registro de origem a tarefa e avulsa (criada em Follow-ups).
  entityType?: CrmEntityType;
  entityId?: string;
  task?: Task;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ entityType, entityId, task, onSuccess, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueAt, setDueAt] = useState(
    task ? toDatetimeLocalValue(task.due_at) : toDatetimeLocalValue(nextMorning().toISOString()),
  );
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? user?.id ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: directory } = useUserDirectory();
  // O proprio usuario vem primeiro; sem o diretorio, a tarefa fica com quem a cria.
  const colleagues = (directory?.data ?? []).filter(
    (person) => person.status === 'active' && person.id !== user?.id,
  );

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const submitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !title.trim() || !dueAt || !user) return;

    setErrorMessage(null);
    try {
      const due_at = fromDatetimeLocalValue(dueAt);
      if (task) {
        await updateMutation.mutateAsync({
          taskId: task.id,
          input: { title: title.trim(), due_at, assigned_to: assignedTo || undefined },
        });
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          assigned_to: assignedTo || user.id,
          due_at,
          ...(entityType && entityId ? { entity_type: entityType, entity_id: entityId } : {}),
        });
      }
      onSuccess();
    } catch (err) {
      if (isPermissionDenied(err)) {
        setErrorMessage('Você não tem permissão para realizar esta ação.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Não foi possível salvar a tarefa.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Não foi possível salvar">
          {errorMessage}
        </Alert>
      )}

      <Input
        label="Título"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        label="Prazo"
        type="datetime-local"
        required
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
      />
      {colleagues.length > 0 && (
        <Select
          label="Responsável"
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
        >
          {user && <option value={user.id}>Eu</option>}
          {task &&
            task.assigned_to !== user?.id &&
            !colleagues.some((p) => p.id === task.assigned_to) && (
              <option value={task.assigned_to}>Responsável atual</option>
            )}
          {colleagues.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      )}

      <div className="flex gap-2">
        <Button writes type="submit" size="sm" loading={submitting} disabled={submitting}>
          {task ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
