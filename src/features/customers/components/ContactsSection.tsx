import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { ContactForm } from './ContactForm';
import { useContactsQuery, useDeleteContact } from '../hooks/useContacts';
import type { Contact } from '../types/customer';

interface ContactsSectionProps {
  customerId: string;
}

// Dentro do detalhe do Customer (secao 15) — nunca uma pagina/modulo proprio (D-065).
export function ContactsSection({ customerId }: ContactsSectionProps) {
  const { hasPermission } = useAuth();
  const { data: contacts, isPending, isError, error, refetch } = useContactsQuery(customerId);
  const deleteMutation = useDeleteContact(customerId);

  const [mode, setMode] = useState<{ kind: 'create' } | { kind: 'edit'; contact: Contact } | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = hasPermission('customers:update');
  const canEdit = hasPermission('customers:update');
  const canDelete = hasPermission('customers:delete');

  async function handleDelete(contact: Contact) {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(contact.id);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'Nao foi possivel excluir o contato.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Contatos</h2>
        {canCreate && mode === null && (
          <Button size="sm" variant="secondary" onClick={() => setMode({ kind: 'create' })}>
            Adicionar contato
          </Button>
        )}
      </div>

      {mode?.kind === 'create' && (
        <ContactForm
          customerId={customerId}
          onSuccess={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}

      {deleteError && (
        <Alert tone="danger" title="Nao foi possivel excluir">
          {deleteError}
        </Alert>
      )}

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando contatos...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar os contatos">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {contacts && contacts.length === 0 && mode === null && (
        <EmptyState title="Nenhum contato cadastrado" description="Adicione o primeiro contato deste cliente." />
      )}

      {contacts && contacts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <li key={contact.id} className="border-border-subtle rounded-lg border p-3">
              {mode?.kind === 'edit' && mode.contact.id === contact.id ? (
                <ContactForm
                  customerId={customerId}
                  contact={contact}
                  onSuccess={() => setMode(null)}
                  onCancel={() => setMode(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">{contact.name}</p>
                    {contact.role && <p className="text-sm text-neutral-500">{contact.role}</p>}
                    <p className="text-sm text-neutral-600">
                      {[contact.phone, contact.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMode({ kind: 'edit', contact })}
                      >
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleteMutation.isPending}
                        onClick={() => void handleDelete(contact)}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
