import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { createInteraction, deleteInteraction, listTimeline } from '../services/interactions';
import type { CrmEntityType, InteractionCreateInput } from '../types/interactions';

// Exportada para que a criacao/edicao/exclusao de notas (follow-up) invalide a timeline,
// que tambem as exibe.
export function timelineQueryKey(entityType: CrmEntityType, entityId: string) {
  return ['interactions', 'timeline', entityType, entityId];
}

const TIMELINES_KEY = ['interactions', 'timeline'];

export function useTimelineQuery(
  entityType: CrmEntityType,
  entityId: string | undefined,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: timelineQueryKey(entityType, entityId as string),
    queryFn: ({ pageParam }) => listTimeline(entityType, entityId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: enabled && Boolean(entityId),
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InteractionCreateInput) => createInteraction(input),
    // D-095: uma interacao da Oportunidade tambem aparece na timeline do Cliente dela; recarrega
    // todas as timelines em cache em vez de so a desta entidade.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIMELINES_KEY });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TIMELINES_KEY });
    },
  });
}
