import { useState } from 'react';

import { Select } from '@/components/ui/Select';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { useMyAvailabilityQuery, useSetMyAvailability } from '../hooks/useAvailability';
import { SELF_STATUSES, STATUS_LABELS } from '../lib/labels';
import type { AvailabilityStatus } from '../types/availability';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'AVAILABILITY_TRAINING_LOCKED') {
      return 'Voce nao pode alterar a disponibilidade enquanto estiver em Treinamento.';
    }
    if (error.code === 'AVAILABILITY_DISABLED') {
      return 'A disponibilidade foi desabilitada para esta empresa.';
    }
    if (error.status === 403) return 'Voce nao tem permissao para alterar a disponibilidade.';
  }
  return 'Nao foi possivel alterar a disponibilidade.';
}

function SelectorInner({ className = '' }: { className?: string }) {
  const { data } = useMyAvailabilityQuery(true);
  const mutation = useSetMyAvailability();
  const [error, setError] = useState<string | null>(null);

  // Mecanismo desabilitado (ou ainda carregando/erro): o seletor nao e exibido (D-071).
  if (!data || !data.enabled) return null;

  const locked = data.status === 'training';
  const options: AvailabilityStatus[] = locked ? ['training'] : SELF_STATUSES;

  async function handleChange(status: AvailabilityStatus) {
    setError(null);
    try {
      await mutation.mutateAsync(status);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Select
        label="Disponibilidade"
        value={data.status}
        disabled={locked || mutation.isPending}
        onChange={(event) => void handleChange(event.target.value as AvailabilityStatus)}
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      {locked && (
        <p className="text-xs text-neutral-500">Definido pelo gestor; so ele pode retirar.</p>
      )}
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

// Seletor de estado do PROPRIO usuario (AppShell). So existe para quem pode alterar o proprio
// estado (`availability:update` ou `availability:manage`) e com o mecanismo habilitado — UX
// apenas: o backend valida permissao, flag e regras em toda escrita.
export function AvailabilitySelector({ className }: { className?: string }) {
  const { hasPermission } = useAuth();
  if (!hasPermission('availability:update') && !hasPermission('availability:manage')) return null;
  return <SelectorInner className={className} />;
}
