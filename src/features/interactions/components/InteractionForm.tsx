import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '@/features/follow-up/lib/datetime';
import { ApiError } from '@/services/api';
import { useCreateInteraction } from '../hooks/useTimeline';
import type { CrmEntityType, InteractionDirection } from '../types/interactions';

interface InteractionFormProps {
  entityType: CrmEntityType;
  entityId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// F4.4: registro manual de contato. Sem edicao (so criar/excluir). `channel` e `outcome` sao
// texto livre; `direction` e opcional.
export function InteractionForm({
  entityType,
  entityId,
  onSuccess,
  onCancel,
}: InteractionFormProps) {
  const [channel, setChannel] = useState('');
  const [direction, setDirection] = useState<'' | InteractionDirection>('');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [occurredAt, setOccurredAt] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useCreateInteraction(entityType, entityId);
  const submitting = mutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !channel.trim() || !summary.trim()) return;

    setErrorMessage(null);
    try {
      await mutation.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        channel: channel.trim(),
        summary: summary.trim(),
        ...(direction ? { direction } : {}),
        ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
        ...(occurredAt ? { occurred_at: fromDatetimeLocalValue(occurredAt) } : {}),
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Nao foi possivel registrar a interacao.',
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel registrar">
          {errorMessage}
        </Alert>
      )}

      <Input
        label="Canal"
        required
        maxLength={100}
        hint="Ex.: telefone, e-mail, presencial"
        value={channel}
        onChange={(event) => setChannel(event.target.value)}
      />
      <Select
        label="Direcao"
        value={direction}
        onChange={(event) => setDirection(event.target.value as '' | InteractionDirection)}
      >
        <option value="">Nao informada</option>
        <option value="inbound">Entrada (o contato nos procurou)</option>
        <option value="outbound">Saida (nos procuramos o contato)</option>
      </Select>
      <Textarea
        label="Resumo"
        required
        maxLength={5000}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />
      <Input
        label="Resultado"
        maxLength={200}
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
      />
      <Input
        label="Quando ocorreu"
        type="datetime-local"
        value={occurredAt}
        onChange={(event) => setOccurredAt(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
          Registrar
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
