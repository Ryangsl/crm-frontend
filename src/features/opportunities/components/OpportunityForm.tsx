import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { CustomerPicker } from '@/features/customers/components/CustomerPicker';
import { ApiError } from '@/services/api';
import { useCreateOpportunity, useUpdateOpportunity } from '../hooks/useOpportunityMutations';
import { usePipelinesQuery } from '../hooks/useOpportunities';
import { parseMoney } from '../lib/money';
import type { Opportunity, Pipeline } from '../types/opportunity';

interface OpportunityFormProps {
  opportunity?: Opportunity;
  // Criacao a partir de um lead convertido (BR-04): cliente e lead ja vem definidos.
  initialCustomer?: { id: string; name: string } | null;
  leadId?: string;
  onSuccess: (opportunity: Opportunity) => void;
  onCancel?: () => void;
}

// Criacao: cliente + pipeline + etapa inicial (nao terminal) + valor opcional (obrigatorio se a
// etapa exigir — D-034, regra da PROPRIA etapa). Edicao: so o valor (etapa/status so mudam via
// mover/ganhar/perder). O backend revalida tudo.
export function OpportunityForm({
  opportunity,
  initialCustomer = null,
  leadId,
  onSuccess,
  onCancel,
}: OpportunityFormProps) {
  const { data: pipelines, isPending, isError } = usePipelinesQuery();

  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(initialCustomer);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [valueInput, setValueInput] = useState(opportunity?.value ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateOpportunity();
  const updateMutation = useUpdateOpportunity(opportunity?.id ?? '');
  const submitting = createMutation.isPending || updateMutation.isPending;

  const list: Pipeline[] = pipelines?.data ?? [];
  const activePipeline =
    list.find((pipeline) => pipeline.id === pipelineId) ??
    list.find((pipeline) => pipeline.is_default) ??
    list[0];
  const initialStages = (activePipeline?.stages ?? []).filter((s) => !s.is_won && !s.is_lost);
  const activeStage = opportunity
    ? list.flatMap((pipeline) => pipeline.stages).find((stage) => stage.id === opportunity.stage_id)
    : (initialStages.find((stage) => stage.id === stageId) ?? initialStages[0]);

  const value = parseMoney(valueInput);
  const stageRequiresValue = Boolean(activeStage?.requires_value);
  const valueMissing = stageRequiresValue && (!value.ok || value.value === null);
  const valueInvalid = !value.ok;

  const canSubmit = opportunity
    ? !valueInvalid && !valueMissing
    : Boolean(customer && activePipeline && activeStage) && !valueInvalid && !valueMissing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !canSubmit || !value.ok) return;

    setErrorMessage(null);
    try {
      const result = opportunity
        ? await updateMutation.mutateAsync({ value: value.value })
        : await createMutation.mutateAsync({
            customer_id: customer!.id,
            pipeline_id: activePipeline!.id,
            stage_id: activeStage!.id,
            ...(value.value !== null ? { value: value.value } : {}),
            ...(leadId ? { lead_id: leadId } : {}),
          });
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Você não tem permissão para realizar esta ação.');
        return;
      }
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Não foi possível salvar a oportunidade.',
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="danger" title="Não foi possível salvar">
          {errorMessage}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando pipelines...
        </p>
      )}
      {isError && <Alert tone="danger">Não foi possível carregar os pipelines.</Alert>}

      {!opportunity && <CustomerPicker selected={customer} onSelect={setCustomer} />}

      {!opportunity && list.length > 0 && (
        <>
          <Select
            label="Pipeline"
            value={activePipeline?.id ?? ''}
            onChange={(event) => {
              setPipelineId(event.target.value);
              setStageId('');
            }}
          >
            {list.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </Select>
          <Select
            label="Etapa inicial"
            value={activeStage?.id ?? ''}
            onChange={(event) => setStageId(event.target.value)}
          >
            {initialStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </>
      )}

      <Input
        label="Valor"
        inputMode="decimal"
        required={stageRequiresValue}
        hint={
          stageRequiresValue
            ? 'A etapa selecionada exige valor. Ex.: 1500,00'
            : 'Opcional nesta etapa. Ex.: 1500,00'
        }
        value={valueInput}
        error={valueInvalid ? 'Informe um valor válido (ex.: 1500,00).' : undefined}
        onChange={(event) => setValueInput(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={submitting} disabled={submitting || !canSubmit}>
          {opportunity ? 'Salvar alterações' : 'Criar oportunidade'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
