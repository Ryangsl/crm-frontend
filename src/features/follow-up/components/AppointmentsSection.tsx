import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { AppointmentForm } from './AppointmentForm';
import { useAppointmentsQuery, useDeleteAppointment } from '../hooks/useAppointments';
import type { Appointment, CrmEntityType } from '../types/followUp';

interface AppointmentsSectionProps {
  entityType: CrmEntityType;
  entityId: string;
}

// D-031: compromissos (agenda) vinculados a uma entidade do CRM quando criados a partir do
// detalhe de Customer/Lead/Opportunity. Recorrencia/calendario externo/notificacoes ficam
// para incrementos futuros (fora do escopo da 3.6).
export function AppointmentsSection({ entityType, entityId }: AppointmentsSectionProps) {
  const { hasPermission } = useAuth();
  const {
    data: appointments,
    isPending,
    isError,
    error,
    refetch,
  } = useAppointmentsQuery(entityType, entityId);
  const deleteMutation = useDeleteAppointment(entityType, entityId);

  const [mode, setMode] = useState<
    { kind: 'create' } | { kind: 'edit'; appointment: Appointment } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = hasPermission('appointments:create');
  const canEdit = hasPermission('appointments:update');
  const canDelete = hasPermission('appointments:delete');

  async function handleDelete(appointment: Appointment) {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(appointment.id);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'Nao foi possivel excluir o compromisso.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Agenda</h2>
        {canCreate && mode === null && (
          <Button size="sm" variant="secondary" onClick={() => setMode({ kind: 'create' })}>
            Adicionar compromisso
          </Button>
        )}
      </div>

      {mode?.kind === 'create' && (
        <AppointmentForm
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}

      {deleteError && (
        <Alert tone="danger" title="Nao foi possivel excluir">
          {deleteError}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando agenda...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar a agenda">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {appointments && appointments.length === 0 && mode === null && (
        <EmptyState
          title="Nenhum compromisso agendado"
          description="Adicione o primeiro compromisso deste registro."
        />
      )}

      {appointments && appointments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="border-border-subtle rounded-lg border p-3">
              {mode?.kind === 'edit' && mode.appointment.id === appointment.id ? (
                <AppointmentForm
                  entityType={entityType}
                  entityId={entityId}
                  appointment={appointment}
                  onSuccess={() => setMode(null)}
                  onCancel={() => setMode(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {new Date(appointment.starts_at).toLocaleString('pt-BR')} —{' '}
                      {new Date(appointment.ends_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMode({ kind: 'edit', appointment })}
                      >
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleteMutation.isPending}
                        onClick={() => void handleDelete(appointment)}
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
