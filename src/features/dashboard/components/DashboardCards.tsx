import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, ClipboardCheck, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Td, Tbody, Th, Thead, Tr } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import {
  listScheduledAppointments,
  listScheduledTasks,
} from '@/features/follow-up/services/followUp';
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge';
import { useLeadSourcesQuery, useLeadsQuery } from '@/features/leads/hooks/useLeads';
import { formatBrl } from '../services/dashboard';
import type { PipelineSummary } from '../services/dashboard';

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-brand-700 inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
    >
      {label} <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

export function PipelineCard({ pipeline }: { pipeline: PipelineSummary | null }) {
  return (
    <Card title="Pipeline de oportunidades" action={<SeeAll to="/pipeline" label="Ver pipeline" />}>
      {!pipeline ? (
        <p className="py-6 text-center text-neutral-500">Nenhum pipeline cadastrado.</p>
      ) : (
        <>
          <p className="mb-3 text-neutral-600">
            Valor em aberto:{' '}
            <span className="font-semibold text-neutral-900 tabular-nums">
              {formatBrl(pipeline.total_value)}
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {pipeline.stages.map((stage) => (
              <li key={stage.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-neutral-900">{stage.name}</span>
                  <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
                    {stage.count} · {formatBrl(stage.value)} · {stage.percent}%
                  </span>
                </div>
                <ProgressBar label={`Oportunidades em ${stage.name}`} percent={stage.percent} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Agenda de hoje do proprio usuario: tarefas com prazo hoje e compromissos que comecam hoje.
export function TodayCard() {
  const { user, hasPermission } = useAuth();
  const range = useMemo(() => todayRange(), []);
  const canTasks = hasPermission('tasks:read');
  const canAppointments = hasPermission('appointments:read');
  const userId = user?.id ?? '';

  const tasks = useQuery({
    queryKey: ['tasks', 'today', userId, range.from],
    queryFn: () =>
      listScheduledTasks({ assigned_to: userId, due_from: range.from, due_to: range.to }),
    enabled: canTasks && Boolean(userId),
  });
  const appointments = useQuery({
    queryKey: ['appointments', 'today', userId, range.from],
    queryFn: () =>
      listScheduledAppointments({ user_id: userId, starts_from: range.from, starts_to: range.to }),
    enabled: canAppointments && Boolean(userId),
  });

  if (!canTasks && !canAppointments) return null;

  const items = [
    ...(tasks.data?.data ?? []).map((task) => ({
      id: task.id,
      at: task.due_at,
      title: task.title,
      kind: task.status === 'done' ? 'Tarefa concluída' : 'Tarefa',
      Icon: ClipboardCheck,
    })),
    ...(appointments.data?.data ?? []).map((appointment) => ({
      id: appointment.id,
      at: appointment.starts_at,
      title: 'Compromisso',
      kind: `Até ${TIME.format(new Date(appointment.ends_at))}`,
      Icon: CalendarClock,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Card title="Atividades de hoje" action={<SeeAll to="/follow-ups" label="Ver todas" />}>
      {tasks.isLoading || appointments.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-neutral-500">Nada agendado para hoje.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="bg-brand-50 text-brand-700 rounded-control flex size-8 shrink-0 items-center justify-center">
                <item.Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="w-11 shrink-0 text-xs text-neutral-500 tabular-nums">
                {TIME.format(new Date(item.at))}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-neutral-900">{item.title}</span>
                <span className="block truncate text-xs text-neutral-500">{item.kind}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function LatestLeadsCard() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('leads:read');
  const { data, isLoading, isError } = useLeadsQuery({ page: 1, limit: 5 }, canRead);
  const { data: sources } = useLeadSourcesQuery(hasPermission('lead_sources:read'));
  const sourceNames = useMemo(
    () => new Map((sources?.data ?? []).map((source) => [source.id, source.name])),
    [sources],
  );

  if (!canRead) return null;

  return (
    <Card title="Últimos leads" action={<SeeAll to="/leads" label="Ver todos" />}>
      {isLoading && <Skeleton className="h-24" />}
      {isError && <p className="py-6 text-center text-neutral-500">Leads indisponíveis agora.</p>}
      {data && data.data.length === 0 && (
        <p className="py-6 text-center text-neutral-500">Nenhum lead cadastrado.</p>
      )}
      {data && data.data.length > 0 && (
        <div className="-mx-4 lg:-mx-5">
          {/* Largura fixa: o nome trunca e o status cabe inteiro no cartao estreito. */}
          <table aria-label="Últimos leads" className="w-full table-fixed text-left text-sm">
            <Thead>
              <Th>Nome</Th>
              <Th className="hidden w-28 2xl:table-cell">Origem</Th>
              <Th className="w-36">Status</Th>
            </Thead>
            <Tbody>
              {data.data.map((lead) => (
                <Tr key={lead.id}>
                  <Td className="truncate">
                    <Link to={`/leads/${lead.id}`} className="text-neutral-900 hover:underline">
                      {lead.name || 'Lead sem nome'}
                    </Link>
                  </Td>
                  <Td className="hidden truncate 2xl:table-cell">
                    {sourceNames.get(lead.source_id) ?? '—'}
                  </Td>
                  <Td>
                    <LeadStatusBadge status={lead.status} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// O produto ainda nao tem cadastro de metas. O espaco existe na identidade aprovada; sem o modulo, o
// painel diz isso em vez de exibir numeros que nao vieram de lugar nenhum.
export function GoalsCard() {
  return (
    <Card title="Metas do mês">
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="bg-surface-muted rounded-control flex size-10 items-center justify-center text-neutral-500">
          <Target aria-hidden="true" className="size-5" />
        </span>
        <p className="font-medium text-neutral-800">Metas ainda não disponíveis</p>
        <p className="text-xs text-neutral-500">O cadastro de metas ainda não faz parte do CRM.</p>
      </div>
    </Card>
  );
}
