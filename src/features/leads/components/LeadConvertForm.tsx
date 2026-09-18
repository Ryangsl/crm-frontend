import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { listCustomers } from '@/features/customers/services/customers';
import type { Customer } from '@/features/customers/types/customer';
import { ApiError } from '@/services/api';
import { useConvertLead } from '../hooks/useLeadMutations';
import type { ConvertLeadInput, Lead } from '../types/lead';

interface LeadConvertFormProps {
  leadId: string;
  onSuccess: (lead: Lead) => void;
  onCancel: () => void;
}

type Mode = 'existing' | 'new';

// BR-04: converter vincula o lead a um Cliente, novo ou existente, resolvido por
// deduplicacao (BR-08/D-067) do lado do backend — este formulario so decide QUAL das duas
// vias usar; a garantia de nao duplicar cliente e sempre do servidor.
export function LeadConvertForm({ leadId, onSuccess, onCancel }: LeadConvertFormProps) {
  const [mode, setMode] = useState<Mode>('existing');

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Customer[] | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [duplicates, setDuplicates] = useState<
    { id: string; name: string; document: string | null; primary_phone: string | null; primary_email: string | null }[]
  >([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const convertMutation = useConvertLead(leadId);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setErrorMessage(null);
    try {
      const res = await listCustomers({ q: query.trim(), limit: 5 });
      setResults(res.data);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel buscar clientes.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (convertMutation.isPending) return;

    setErrorMessage(null);
    setDuplicates([]);

    const input: ConvertLeadInput =
      mode === 'existing' ? { customer_id: selected?.id } : { customer: buildCustomerInput() };

    try {
      const lead = await convertMutation.mutateAsync(input);
      onSuccess(lead);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'CUSTOMER_DUPLICATE') {
        const body = err.body as { candidates?: typeof duplicates } | undefined;
        setDuplicates(body?.candidates ?? []);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel converter o lead.');
    }
  }

  function buildCustomerInput() {
    return {
      name: name.trim(),
      document: document.trim() || undefined,
      primary_phone: phone.trim() || undefined,
      primary_email: email.trim() || undefined,
    };
  }

  const canSubmit = mode === 'existing' ? Boolean(selected) : name.trim().length >= 2;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel converter">
          {errorMessage}
        </Alert>
      )}

      {duplicates.length > 0 && (
        <Alert tone="warning" title="Ja existe cliente com esses dados">
          <p className="mb-2">Revise antes de continuar — nada foi criado nem vinculado.</p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((candidate) => (
              <li key={candidate.id} className="border-border-subtle rounded-lg border p-2 text-sm">
                <p className="font-medium text-neutral-900">{candidate.name}</p>
                <p className="text-neutral-600">
                  {[candidate.document, candidate.primary_phone, candidate.primary_email]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'existing' ? 'primary' : 'secondary'}
          onClick={() => setMode('existing')}
        >
          Cliente existente
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'new' ? 'primary' : 'secondary'}
          onClick={() => setMode('new')}
        >
          Novo cliente
        </Button>
      </div>

      {mode === 'existing' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Buscar cliente"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="self-end">
              <Button type="button" variant="secondary" loading={searching} onClick={() => void handleSearch()}>
                Buscar
              </Button>
            </div>
          </div>

          {results && results.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum cliente encontrado.</p>
          )}

          {results && results.length > 0 && (
            <ul className="flex flex-col gap-1">
              {results.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(customer)}
                    className={`w-full rounded-lg border p-2 text-left text-sm ${
                      selected?.id === customer.id
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-border-subtle'
                    }`}
                  >
                    {customer.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <p className="text-sm text-neutral-700">
              Selecionado: <strong>{selected.name}</strong>
            </p>
          )}
        </div>
      )}

      {mode === 'new' && (
        <div className="flex flex-col gap-3">
          <Input label="Nome" required value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Documento" value={document} onChange={(event) => setDocument(event.target.value)} />
          <Input label="Telefone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={convertMutation.isPending} disabled={!canSubmit}>
          Converter
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={convertMutation.isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
