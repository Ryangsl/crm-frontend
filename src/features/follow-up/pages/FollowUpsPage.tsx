import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useUserNames } from '@/features/users/hooks/useUsers';
import { ApiError } from '@/services/api';
import { TaskForm } from '../components/TaskForm';
import { useUpdateTask } from '../hooks/useTasks';
import { listScheduledAppointments, listScheduledTasks } from '../services/followUp';
import type { CrmEntityType, Task } from '../types/followUp';

const ENTITY_PATHS: Record<CrmEntityType, string> = {
  lead: '/leads',
  customer: '/customers',
  opportunity: '/opportunities',
};

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function groupTasks(tasks: Task[], now: Date) {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const sorted = [...tasks].sort((a, b) => a.due_at.localeCompare(b.due_at));
  return {
    overdue: sorted.filter((task) => new Date(task.due_at) < now),
    today: sorted.filter((task) => {
      const due = new Date(task.due_at);
      return due >= now && due <= endOfToday;
    }),
    upcoming: sorted.filter((task) => new Date(task.due_at) > endOfToday),
  };
}

function EntityLink({ type, id }: { type: CrmEntityType | null; id: string | null }) {
  if (!type || !id) return null;
  return (
    <Link to={`${ENTITY_PATHS[type]}/${id}`} className="text-brand-700 text-xs hover:underline">
      Abrir registro
    </Link>
  );
}

function TaskGroup({
  title,
  tasks,
  badge,
  names,
  onComplete,
  completingId,
}: {
  title: string;
  tasks: Task[];
  badge?: 'danger' | 'info';
  names: Map<string, string>;
  // Ausente = sem permissao para concluir.
  onComplete?: (task: Task) => void;
  completingId: string | null;
}) {
  if (tasks.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900">
        {title} <Badge tone={badge ?? 'neutral'}>{tasks.length}</Badge>
      </h3>
      <ul className="divide-border-subtle divide-y">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
          >
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{task.title}</p>
              <p className="text-xs text-neutral-500">
                {DATE_TIME.format(new Date(task.due_at))}
                {names.get(task.assigned_to) ? ` · ${names.get(task.assigned_to)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EntityLink type={task.entity_type} id={task.entity_id} />
              {onComplete && (
                <Button
                  writes
                  size="sm"
                  variant="secondary"
                  loading={completingId === task.id}
                  aria-label={`Concluir: ${task.title}`}
                  onClick={() => onComplete(task)}
                >
                  Concluir
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Visao transversal de tarefas pendentes e proximos compromissos. Aqui se cria tarefa avulsa e se
// conclui tarefa; editar e excluir continuam no registro de origem. Compromisso nao tem titulo no
// contrato, entao so faz sentido criado dentro de um Cliente, Lead ou Oportunidade.
export function FollowUpsPage() {
  const { hasPermission, user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [creating, setCreating] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const updateTask = useUpdateTask();
  const canCreate = hasPermission('tasks:create');
  const canComplete = hasPermission('tasks:update');
  const mine = scope === 'mine' ? user?.id : undefined;
  const canTasks = hasPermission('tasks:read');
  const canAppointments = hasPermission('appointments:read');
  const names = useUserNames();
  const now = useMemo(() => new Date(), []);

  const tasks = useQuery({
    queryKey: ['tasks', 'pending', mine ?? 'all'],
    queryFn: () => listScheduledTasks({ status: 'pending', assigned_to: mine }),
    enabled: canTasks,
  });
  const appointments = useQuery({
    queryKey: ['appointments', 'upcoming', now.toISOString().slice(0, 10), mine ?? 'all'],
    queryFn: () => listScheduledAppointments({ starts_from: now.toISOString(), user_id: mine }),
    enabled: canAppointments,
  });

  const groups = useMemo(() => groupTasks(tasks.data?.data ?? [], now), [tasks.data, now]);
  const upcoming = [...(appointments.data?.data ?? [])].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );

  async function complete(task: Task) {
    setActionError(null);
    setCompletingId(task.id);
    try {
      await updateTask.mutateAsync({ taskId: task.id, input: { status: 'done' } });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível concluir a tarefa.');
    } finally {
      setCompletingId(null);
    }
  }
  const onComplete = canComplete ? (task: Task) => void complete(task) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Follow-ups</h1>
          <p className="text-sm text-neutral-500">Tarefas pendentes e próximos compromissos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="De quem" className="flex gap-1">
            <Button
              size="sm"
              variant={scope === 'mine' ? 'primary' : 'secondary'}
              aria-pressed={scope === 'mine'}
              onClick={() => setScope('mine')}
            >
              Meus
            </Button>
            <Button
              size="sm"
              variant={scope === 'all' ? 'primary' : 'secondary'}
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
            >
              Da equipe
            </Button>
          </div>
          {canTasks && canCreate && !creating && (
            <Button writes onClick={() => setCreating(true)}>
              Nova tarefa
            </Button>
          )}
        </div>
      </header>

      {creating && (
        <Card title="Nova tarefa">
          <TaskForm onSuccess={() => setCreating(false)} onCancel={() => setCreating(false)} />
        </Card>
      )}

      {actionError && (
        <Alert tone="danger" title="Não foi possível completar a ação">
          {actionError}
        </Alert>
      )}

      {!canTasks && !canAppointments && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver tarefas e compromissos.
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {canTasks && (
          <Card title="Tarefas" className="xl:col-span-2">
            {tasks.isLoading && <Spinner />}
            {tasks.isError && (
              <Alert tone="danger" title="Não foi possível carregar as tarefas">
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => void tasks.refetch()}
                >
                  Tentar novamente
                </Button>
              </Alert>
            )}
            {tasks.data && tasks.data.data.length === 0 && (
              <EmptyState
                title={
                  scope === 'mine' ? 'Você não tem tarefa pendente' : 'Nenhuma tarefa pendente'
                }
                description="Crie uma tarefa aqui ou no registro de um Cliente, Lead ou Oportunidade."
                action={
                  canCreate && !creating ? (
                    <Button writes size="sm" onClick={() => setCreating(true)}>
                      Nova tarefa
                    </Button>
                  ) : undefined
                }
              />
            )}
            <div className="flex flex-col gap-4">
              <TaskGroup
                title="Atrasadas"
                tasks={groups.overdue}
                badge="danger"
                names={names}
                onComplete={onComplete}
                completingId={completingId}
              />
              <TaskGroup
                title="Hoje"
                tasks={groups.today}
                badge="info"
                names={names}
                onComplete={onComplete}
                completingId={completingId}
              />
              <TaskGroup
                title="Próximas"
                tasks={groups.upcoming}
                names={names}
                onComplete={onComplete}
                completingId={completingId}
              />
            </div>
          </Card>
        )}

        {canAppointments && (
          <Card title="Próximos compromissos">
            {appointments.isLoading && <Spinner />}
            {appointments.isError && (
              <Alert tone="danger" title="Não foi possível carregar os compromissos">
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => void appointments.refetch()}
                >
                  Tentar novamente
                </Button>
              </Alert>
            )}
            {appointments.data && upcoming.length === 0 && (
              <EmptyState
                title="Nenhum compromisso agendado"
                description="Agende no registro do Cliente, Lead ou Oportunidade."
              />
            )}
            <ul className="divide-border-subtle divide-y">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="py-2.5">
                  <p className="font-medium text-neutral-900">
                    {DATE_TIME.format(new Date(appointment.starts_at))}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {names.get(appointment.user_id) ?? 'Responsável não informado'}
                    <EntityLink type={appointment.entity_type} id={appointment.entity_id} />
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
