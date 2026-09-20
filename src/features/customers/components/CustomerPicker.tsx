import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/services/api';
import { listCustomers } from '../services/customers';
import type { Customer } from '../types/customer';

interface CustomerPickerProps {
  selected: Pick<Customer, 'id' | 'name'> | null;
  onSelect: (customer: Pick<Customer, 'id' | 'name'>) => void;
}

// Busca simples (nome/documento/telefone/e-mail via `q`) e selecao de UM cliente existente.
export function CustomerPicker({ selected, onSelect }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await listCustomers({ q: query.trim(), limit: 5 });
      setResults(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel buscar clientes.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            label="Buscar cliente"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearch();
              }
            }}
          />
        </div>
        <div className="self-end">
          <Button
            type="button"
            variant="secondary"
            loading={searching}
            onClick={() => void handleSearch()}
          >
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
                onClick={() => onSelect({ id: customer.id, name: customer.name })}
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
          Cliente selecionado: <strong>{selected.name}</strong>
        </p>
      )}
    </div>
  );
}
