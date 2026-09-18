import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/services/api';
import { useCreateContact, useUpdateContact } from '../hooks/useContacts';
import type { Contact, ContactInput } from '../types/customer';

interface ContactFormProps {
  customerId: string;
  contact?: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  role: string;
}

function toFormState(contact?: Contact): FormState {
  return {
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    role: contact?.role ?? '',
  };
}

function toInput(form: FormState): ContactInput {
  return {
    name: form.name.trim(),
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    role: form.role.trim() || undefined,
  };
}

export function ContactForm({ customerId, contact, onSuccess, onCancel }: ContactFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(contact));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateContact(customerId);
  const updateMutation = useUpdateContact(customerId);
  const submitting = createMutation.isPending || updateMutation.isPending;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    try {
      const input = toInput(form);
      if (contact) {
        await updateMutation.mutateAsync({ contactId: contact.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel salvar o contato.');
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
        label="Nome"
        required
        value={form.name}
        onChange={(event) => updateField('name', event.target.value)}
      />
      <Input
        label="Telefone"
        value={form.phone}
        onChange={(event) => updateField('phone', event.target.value)}
      />
      <Input
        label="E-mail"
        type="email"
        value={form.email}
        onChange={(event) => updateField('email', event.target.value)}
      />
      <Input
        label="Cargo/relacao"
        value={form.role}
        onChange={(event) => updateField('role', event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
          {contact ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
