import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { NoteForm } from './NoteForm';
import { useDeleteNote, useNotesQuery } from '../hooks/useNotes';
import type { CrmEntityType, Note } from '../types/followUp';

interface NotesSectionProps {
  entityType: CrmEntityType;
  entityId: string;
}

// D-031: notas sao sempre vinculadas a uma entidade do CRM (entity_type + entity_id) — nunca
// uma tela/modulo proprio, sempre embutida no detalhe de Customer/Lead/Opportunity.
export function NotesSection({ entityType, entityId }: NotesSectionProps) {
  const { hasPermission } = useAuth();
  const { data: notes, isPending, isError, error, refetch } = useNotesQuery(entityType, entityId);
  const deleteMutation = useDeleteNote(entityType, entityId);

  const [mode, setMode] = useState<{ kind: 'create' } | { kind: 'edit'; note: Note } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = hasPermission('notes:create');
  const canEdit = hasPermission('notes:update');
  const canDelete = hasPermission('notes:delete');

  async function handleDelete(note: Note) {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(note.id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Nao foi possivel excluir a nota.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">Notas</h2>
        {canCreate && mode === null && (
          <Button size="sm" variant="secondary" onClick={() => setMode({ kind: 'create' })}>
            Adicionar nota
          </Button>
        )}
      </div>

      {mode?.kind === 'create' && (
        <NoteForm
          entityType={entityType}
          entityId={entityId}
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
          <Spinner size="sm" /> Carregando notas...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar as notas">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {notes && notes.length === 0 && mode === null && (
        <EmptyState title="Nenhuma nota registrada" description="Adicione a primeira nota deste registro." />
      )}

      {notes && notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="border-border-subtle rounded-lg border p-3">
              {mode?.kind === 'edit' && mode.note.id === note.id ? (
                <NoteForm
                  entityType={entityType}
                  entityId={entityId}
                  note={note}
                  onSuccess={() => setMode(null)}
                  onCancel={() => setMode(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="whitespace-pre-wrap text-neutral-800">{note.content}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(note.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => setMode({ kind: 'edit', note })}>
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleteMutation.isPending}
                        onClick={() => void handleDelete(note)}
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
