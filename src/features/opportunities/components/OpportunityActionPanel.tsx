import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ApiError } from '@/services/api';
import {
  useLoseOpportunity,
  useMoveOpportunity,
  useUpdateOpportunity,
  useWinOpportunity,
} from '../hooks/useOpportunityMutations';
import { formatMoney, parseMoney } from '../lib/money';
import type { Opportunity, Stage } from '../types/opportunity';

export type ActionMode = 'move' | 'win' | 'lose';

interface OpportunityActionPanelProps {
  opportunity: Opportunity;
  stages: Stage[];
  mode: ActionMode;
  onDone: () => void;
  onCancel: () => void;
}

// Movimentar / ganhar / perder. Os calculos daqui (salto de etapa, etapa que exige valor) sao
// so UX: o BACKEND e a autoridade e devolve OPPORTUNITY_JUSTIFICATION_REQUIRED /
// OPPORTUNITY_VALUE_REQUIRED se algo escapar — o painel reage a esses codigos, pede o dado e
// permite reenviar (D-032/D-034). A etapa terminal de win/lose e resolvida pelo backend via
// is_won/is_lost; aqui so aparece para informar o usuario (nunca por nome).
export function OpportunityActionPanel({
  opportunity,
  stages,
  mode,
  onDone,
  onCancel,
}: OpportunityActionPanelProps) {
  const ordered = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [stages],
  );
  const current = ordered.find((stage) => stage.id === opportunity.stage_id);
  const moveTargets = ordered.filter(
    (stage) => stage.id !== opportunity.stage_id && !stage.is_won && !stage.is_lost,
  );

  const [destinationId, setDestinationId] = useState('');
  const [justification, setJustification] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [reason, setReason] = useState('');
  const [serverWantsJustification, setServerWantsJustification] = useState(false);
  const [serverWantsValue, setServerWantsValue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateOpportunity(opportunity.id);
  const moveMutation = useMoveOpportunity(opportunity.id);
  const winMutation = useWinOpportunity(opportunity.id);
  const loseMutation = useLoseOpportunity(opportunity.id);

  const destination: Stage | undefined =
    mode === 'move'
      ? ordered.find((stage) => stage.id === destinationId)
      : ordered.find((stage) => (mode === 'win' ? stage.is_won : stage.is_lost));

  const skipsStages =
    mode === 'move' && current && destination
      ? Math.abs(destination.order - current.order) > 1
      : false;
  const showJustification = mode === 'move' && (skipsStages || serverWantsJustification);
  const showValue =
    (Boolean(destination?.requires_value) && opportunity.value === null) || serverWantsValue;

  const parsedValue = parseMoney(valueInput);
  const valueInvalid = showValue && (!parsedValue.ok || parsedValue.value === null);

  const canSubmit =
    !busy &&
    !valueInvalid &&
    (mode !== 'move' || destinationId !== '') &&
    (!showJustification || justification.trim() !== '') &&
    (mode !== 'lose' || reason.trim().length >= 3);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      // Valor exigido pela etapa de destino: salva antes (PATCH) e so entao executa a acao.
      if (showValue && parsedValue.ok && parsedValue.value !== null) {
        await updateMutation.mutateAsync({ value: parsedValue.value });
      }

      if (mode === 'move') {
        await moveMutation.mutateAsync({
          stage_id: destinationId,
          justification: justification.trim() || undefined,
        });
      } else if (mode === 'win') {
        await winMutation.mutateAsync();
      } else {
        await loseMutation.mutateAsync(reason.trim());
      }
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OPPORTUNITY_JUSTIFICATION_REQUIRED') {
        setServerWantsJustification(true);
        setError('Esta movimentação pula etapas: informe uma justificativa e envie novamente.');
      } else if (err instanceof ApiError && err.code === 'OPPORTUNITY_VALUE_REQUIRED') {
        setServerWantsValue(true);
        setError(
          'A etapa de destino exige valor: informe o valor da oportunidade e envie novamente.',
        );
      } else if (err instanceof ApiError && err.status === 403) {
        setError('Você não tem permissão para realizar esta ação.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.');
      }
    } finally {
      setBusy(false);
    }
  }

  const title = {
    move: 'Mover oportunidade',
    win: 'Marcar como ganha',
    lose: 'Marcar como perdida',
  }[mode];
  const submitLabel = { move: 'Mover', win: 'Confirmar ganho', lose: 'Confirmar perda' }[mode];

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-label={title}
      className="border-border-subtle flex flex-col gap-3 rounded-lg border p-3"
    >
      <p className="text-sm font-semibold text-neutral-900">{title}</p>

      {error && (
        <Alert tone="warning" title="Atenção">
          {error}
        </Alert>
      )}

      {mode === 'move' && (
        <Select
          label="Mover para"
          value={destinationId}
          onChange={(event) => setDestinationId(event.target.value)}
        >
          <option value="" disabled>
            Selecione a etapa
          </option>
          {moveTargets.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
      )}

      {mode === 'win' && (
        <p className="text-sm text-neutral-600">
          A oportunidade será movida para a etapa de ganho do pipeline
          {destination ? ` (${destination.name})` : ''}.
        </p>
      )}

      {mode === 'lose' && (
        <>
          <p className="text-sm text-neutral-600">
            A oportunidade será movida para a etapa de perda do pipeline
            {destination ? ` (${destination.name})` : ''}.
          </p>
          <Input
            label="Motivo da perda"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </>
      )}

      {showJustification && (
        <Input
          label="Justificativa"
          hint="Obrigatória: a movimentação pula uma ou mais etapas."
          required
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
        />
      )}

      {showValue && (
        <Input
          label="Valor da oportunidade"
          hint="A etapa de destino exige valor. Ex.: 1500,00"
          required
          inputMode="decimal"
          value={valueInput}
          error={
            valueInput !== '' && valueInvalid
              ? 'Informe um valor válido (ex.: 1500,00).'
              : undefined
          }
          onChange={(event) => setValueInput(event.target.value)}
        />
      )}

      {!showValue && opportunity.value !== null && mode !== 'lose' && (
        <p className="text-xs text-neutral-500">Valor atual: {formatMoney(opportunity.value)}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy} disabled={!canSubmit}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
