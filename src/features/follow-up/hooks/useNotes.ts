import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createNote, deleteNote, listNotes, updateNote } from '../services/followUp';
import type { CrmEntityType, NoteCreateInput, NoteUpdateInput } from '../types/followUp';

function queryKey(entityType: CrmEntityType, entityId: string) {
  return ['follow-up', 'notes', entityType, entityId];
}

export function useNotesQuery(entityType: CrmEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKey(entityType, entityId as string),
    queryFn: () => listNotes(entityType, entityId as string),
    enabled: Boolean(entityId),
    select: (response) => response.data,
  });
}

export function useCreateNote(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteCreateInput) => createNote(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useUpdateNote(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: NoteUpdateInput }) =>
      updateNote(noteId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useDeleteNote(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}
