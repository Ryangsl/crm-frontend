import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { isPermissionDenied } from '@/features/plan/lib/labels';
import { ApiError } from '@/services/api';
import { useCreateLead, useUpdateLead } from '../hooks/useLeadMutations';
import { useLeadSourcesQuery } from '../hooks/useLeads';
import {
  describeLeadValidation,
  initialLeadValues,
  toLeadPayload,
  validateLead,
} from '../lib/lead-input';
import type { LeadFormErrors, LeadFormValues } from '../lib/lead-input';
import type { Lead } from '../types/lead';

interface LeadFormProps {
  lead?: Lead;
  onSuccess: (lead: Lead) => void;
  onCancel?: () => void;
}

// Cadastro e edicao manual de Lead (D-094): nome, telefone, e-mail, documento e origem. Exige nome e
// ao menos um contato. O responsavel continua vindo da distribuicao automatica na criacao (D-068).
// Quem decide e o backend; aqui so se orienta o preenchimento.
export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const { hasPermission } = useAuth();
  const { data: sources, isPending: sourcesPending } = useLeadSourcesQuery();
  const [values, setValues] = useState<LeadFormValues>(() => initialLeadValues(lead));
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead(lead?.id ?? '');
  const submitting = createMutation.isPending || updateMutation.isPending;
  const noSources = sources !== undefined && sources.data.length === 0;

  function set<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const found = validateLead(values);
    setErrors(found);
    setErrorMessage(null);
    if (Object.keys(found).length > 0) return;

    const payload = toLeadPayload(values, !!lead);
    try {
      const result = lead
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      onSuccess(result);
    } catch (err) {
      if (isPermissionDenied(err)) {
        setErrorMessage('Você não tem permissão para realizar esta ação.');
        return;
      }
      setErrorMessage(
        describeLeadValidation(err) ??
          (err instanceof ApiError ? err.message : 'Não foi possível salvar o lead.'),
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
      {errorMessage && (
        <Alert tone="danger" title="Não foi possível salvar">
          {errorMessage}
        </Alert>
      )}

      <Input
        label="Nome"
        required
        autoComplete="name"
        value={values.name}
        onChange={(event) => set('name', event.target.value)}
        error={errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={values.phone}
          onChange={(event) => set('phone', event.target.value)}
          error={errors.phone}
        />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => set('email', event.target.value)}
          error={errors.email}
        />
      </div>
      {errors.contact && (
        <p role="alert" className="text-danger -mt-2 text-sm">
          {errors.contact}
        </p>
      )}
      <Input
        label="CPF ou CNPJ (opcional)"
        inputMode="numeric"
        value={values.document}
        onChange={(event) => set('document', event.target.value)}
        error={errors.document}
      />

      {sourcesPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando origens...
        </p>
      )}
      {noSources && (
        <Alert tone="warning" title="Nenhuma origem cadastrada">
          Todo lead precisa de uma origem.{' '}
          {hasPermission('lead_sources:create') ? (
            <Link to="/settings/lead-sources" className="text-brand-700 font-medium underline">
              Cadastre uma origem
            </Link>
          ) : (
            'Peça ao Admin da empresa para cadastrar as origens.'
          )}
        </Alert>
      )}
      {sources && !noSources && (
        <Select
          label="Origem"
          required
          value={values.sourceId}
          onChange={(event) => set('sourceId', event.target.value)}
          error={errors.sourceId}
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
          O responsável é escolhido automaticamente pela distribuição da empresa.
        </p>
      )}

      <div className="flex gap-2">
        <Button writes type="submit" loading={submitting} disabled={submitting || noSources}>
          {lead ? 'Salvar alterações' : 'Criar lead'}
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
