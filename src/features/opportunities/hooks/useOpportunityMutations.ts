import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createOpportunity,
  deleteOpportunity,
  loseOpportunity,
  moveOpportunity,
  updateOpportunity,
  winOpportunity,
} from '../services/opportunities';
import type {
  MoveInput,
  OpportunityCreateInput,
  OpportunityUpdateInput,
} from '../types/opportunity';

// Toda mutacao invalida ['opportunities'] — lista, detalhe e Kanban recarregam juntos.
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
}

export function useCreateOpportunity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: OpportunityCreateInput) => createOpportunity(input),
    onSuccess: invalidate,
  });
}

export function useUpdateOpportunity(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: OpportunityUpdateInput) => updateOpportunity(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteOpportunity() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: invalidate,
  });
}

export function useMoveOpportunity(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: MoveInput) => moveOpportunity(id, input),
    onSuccess: invalidate,
  });
}

export function useWinOpportunity(id: string) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => winOpportunity(id), onSuccess: invalidate });
}

export function useLoseOpportunity(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (reason: string) => loseOpportunity(id, reason),
    onSuccess: invalidate,
  });
}
