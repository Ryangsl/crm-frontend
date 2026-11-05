import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useUserNames } from '@/features/users/hooks/useUsers';
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
}: {
  title: string;
  tasks: Task[];
  badge?: 'danger' | 'info';
  names: Map<string, string>;
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
            <EntityLink type={task.entity_type} id={task.entity_id} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Visao transversal de tarefas pendentes e proximos compromissos. So consulta: criar, editar e concluir
// continuam no registro de origem (Cliente, Lead ou Oportunidade).
export function FollowUpsPage() {
  const { hasPermission } = useAuth();
  const canTasks = hasPermission('tasks:read');
  const canAppointments = hasPermission('appointments:read');
  const names = useUserNames();
  const now = useMemo(() => new Date(), []);

  const tasks = useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: () => listScheduledTasks({ status: 'pending' }),
    enabled: canTasks,
  });
  const appointments = useQuery({
    queryKey: ['appointments', 'upcoming', now.toISOString().slice(0, 10)],
    queryFn: () => listScheduledAppointments({ starts_from: now.toISOString() }),
    enabled: canAppointments,
  });

  const groups = useMemo(() => groupTasks(tasks.data?.data ?? [], now), [tasks.data, now]);
  const upcoming = [...(appointments.data?.data ?? [])].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Follow-ups</h1>
        <p className="text-sm text-neutral-500">Tarefas pendentes e próximos compromissos.</p>
      </header>

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
                title="Nenhuma tarefa pendente"
                description="As tarefas são criadas no registro do Cliente, Lead ou Oportunidade."
              />
            )}
            <div className="flex flex-col gap-4">
              <TaskGroup title="Atrasadas" tasks={groups.overdue} badge="danger" names={names} />
              <TaskGroup title="Hoje" tasks={groups.today} badge="info" names={names} />
              <TaskGroup title="Próximas" tasks={groups.upcoming} names={names} />
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
              <EmptyState title="Nenhum compromisso agendado" />
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
