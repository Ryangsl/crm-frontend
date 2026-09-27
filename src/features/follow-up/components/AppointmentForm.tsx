import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/datetime';
import { useCreateAppointment, useUpdateAppointment } from '../hooks/useAppointments';
import type { Appointment, CrmEntityType } from '../types/followUp';

interface AppointmentFormProps {
  entityType: CrmEntityType;
  entityId: string;
  appointment?: Appointment;
  onSuccess: () => void;
  onCancel: () => void;
}

function defaultEnd(startIso: string): string {
  return new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
}

export function AppointmentForm({
  entityType,
  entityId,
  appointment,
  onSuccess,
  onCancel,
}: AppointmentFormProps) {
  const { user } = useAuth();
  const now = new Date().toISOString();
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(appointment?.starts_at ?? now),
  );
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(appointment?.ends_at ?? defaultEnd(now)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateAppointment(entityType, entityId);
  const updateMutation = useUpdateAppointment(entityType, entityId);
  const submitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !startsAt || !endsAt || !user) return;

    setErrorMessage(null);
    try {
      const starts_at = fromDatetimeLocalValue(startsAt);
      const ends_at = fromDatetimeLocalValue(endsAt);
      if (appointment) {
        await updateMutation.mutateAsync({
          appointmentId: appointment.id,
          input: { starts_at, ends_at },
        });
      } else {
        await createMutation.mutateAsync({
          user_id: user.id,
          starts_at,
          ends_at,
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
      if (err instanceof ApiError && err.code === 'APPOINTMENT_INVALID_RANGE') {
        setErrorMessage('O inicio deve ser anterior ao termino do compromisso.');
        return;
      }
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Nao foi possivel salvar o compromisso.',
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {errorMessage}
        </Alert>
      )}

      <Input
        label="Inicio"
        type="datetime-local"
        required
        value={startsAt}
        onChange={(event) => setStartsAt(event.target.value)}
      />
      <Input
        label="Termino"
        type="datetime-local"
        required
        value={endsAt}
        onChange={(event) => setEndsAt(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
          {appointment ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
