import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/services/api';
import { useCreateLead, useUpdateLead } from '../hooks/useLeadMutations';
import { useLeadSourcesQuery } from '../hooks/useLeads';
import type { Lead } from '../types/lead';

interface LeadFormProps {
  lead?: Lead;
  onSuccess: (lead: Lead) => void;
  onCancel?: () => void;
}

// Reutilizavel para criacao e edicao. Campo unico editavel: source (secao 18/19 da 3.4 —
// "Formulario: criar; editar; validacao; source"). owner_id nao e editavel por aqui: na
// criacao o round-robin decide automaticamente (D-068), e reatribuicao manual fica para um
// incremento futuro com um seletor de usuario dedicado.
export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const { data: sources, isPending: sourcesPending } = useLeadSourcesQuery();
  const [sourceId, setSourceId] = useState(lead?.source_id ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead(lead?.id ?? '');
  const submitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !sourceId) return;

    setErrorMessage(null);
    try {
      const result = lead
        ? await updateMutation.mutateAsync({ source_id: sourceId })
        : await createMutation.mutateAsync({ source_id: sourceId });
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel salvar o lead.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {errorMessage}
        </Alert>
      )}

      {sourcesPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando origens...
        </p>
      )}

      {sources && (
        <Select
          label="Origem"
          required
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
        >
          <option value="" disabled>
            Selecione uma origem
          </option>
          {sources.data.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </Select>
      )}

      {!lead && (
        <p className="text-sm text-neutral-500">
          O responsavel e escolhido automaticamente por distribuicao round-robin.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={submitting} disabled={submitting || !sourceId}>
          {lead ? 'Salvar alteracoes' : 'Criar lead'}
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
