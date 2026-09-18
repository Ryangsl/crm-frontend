import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/services/api';
import { useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomerMutations';
import type { Customer, CustomerDuplicateCandidate, CustomerInput } from '../types/customer';

interface CustomerFormProps {
  customer?: Customer;
  onSuccess: (customer: Customer) => void;
  onCancel?: () => void;
}

interface FormState {
  name: string;
  document: string;
  primary_phone: string;
  primary_email: string;
}

function toFormState(customer?: Customer): FormState {
  return {
    name: customer?.name ?? '',
    document: customer?.document ?? '',
    primary_phone: customer?.primary_phone ?? '',
    primary_email: customer?.primary_email ?? '',
  };
}

// undefined nos campos opcionais quando vazios: o backend trata ausencia como "nao mexe"
// (edicao) e como "nao informado" (criacao) — nunca envia string vazia para nao acionar
// validacao de formato (document/primary_phone/primary_email) a toa.
function toInput(form: FormState): CustomerInput {
  return {
    name: form.name.trim(),
    document: form.document.trim() || undefined,
    primary_phone: form.primary_phone.trim() || undefined,
    primary_email: form.primary_email.trim() || undefined,
  };
}

// Reutilizavel para criacao e edicao (secao 13) — D-067: em 409 mostra os candidatos
// retornados pela API e deixa o usuario decidir; nunca cria/escolhe automaticamente.
export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(customer));
  const [duplicates, setDuplicates] = useState<CustomerDuplicateCandidate[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(customer?.id ?? '');
  const submitting = createMutation.isPending || updateMutation.isPending;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return; // previne duplo submit.

    setErrorMessage(null);
    setDuplicates(null);

    try {
      const input = toInput(form);
      const result = customer
        ? await updateMutation.mutateAsync(input)
        : await createMutation.mutateAsync(input);
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { candidates?: CustomerDuplicateCandidate[] } | undefined;
        setDuplicates(body?.candidates ?? []);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel salvar o cliente.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {errorMessage}
        </Alert>
      )}

      {duplicates && (
        <Alert tone="warning" title="Ja existe cliente com esses dados">
          <p className="mb-2">
            Encontramos {duplicates.length === 1 ? 'um cliente' : `${duplicates.length} clientes`} com
            o mesmo documento, telefone ou e-mail neste tenant. Revise antes de continuar — nada foi
            criado.
          </p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((candidate) => (
              <li key={candidate.id} className="border-border-subtle rounded-lg border p-2 text-sm">
                <p className="font-medium text-neutral-900">{candidate.name}</p>
                <p className="text-neutral-600">
                  {[candidate.document, candidate.primary_phone, candidate.primary_email]
                    .filter(Boolean)
                    .join(' · ') || 'Sem dados de contato'}
                </p>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Input
        label="Nome"
        required
        value={form.name}
        onChange={(event) => updateField('name', event.target.value)}
      />
      <Input
        label="Documento (CPF/CNPJ)"
        hint="Somente numeros ou com mascara — a mascara e removida automaticamente."
        value={form.document}
        onChange={(event) => updateField('document', event.target.value)}
      />
      <Input
        label="Telefone"
        hint="Formato internacional, ex.: +5511999999999"
        value={form.primary_phone}
        onChange={(event) => updateField('primary_phone', event.target.value)}
      />
      <Input
        label="E-mail"
        type="email"
        value={form.primary_email}
        onChange={(event) => updateField('primary_email', event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={submitting} disabled={submitting}>
          {customer ? 'Salvar alteracoes' : 'Criar cliente'}
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
