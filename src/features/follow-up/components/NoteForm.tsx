import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/services/api';
import { useCreateNote, useUpdateNote } from '../hooks/useNotes';
import type { CrmEntityType, Note } from '../types/followUp';

interface NoteFormProps {
  entityType: CrmEntityType;
  entityId: string;
  note?: Note;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NoteForm({ entityType, entityId, note, onSuccess, onCancel }: NoteFormProps) {
  const [content, setContent] = useState(note?.content ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateNote(entityType, entityId);
  const updateMutation = useUpdateNote(entityType, entityId);
  const submitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !content.trim()) return;

    setErrorMessage(null);
    try {
      if (note) {
        await updateMutation.mutateAsync({ noteId: note.id, input: { content: content.trim() } });
      } else {
        await createMutation.mutateAsync({ entity_type: entityType, entity_id: entityId, content: content.trim() });
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setErrorMessage('Voce nao tem permissao para realizar esta acao.');
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Nao foi possivel salvar a nota.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {errorMessage}
        </Alert>
      )}

      <Textarea
        label="Nota"
        required
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting} disabled={submitting}>
          {note ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
