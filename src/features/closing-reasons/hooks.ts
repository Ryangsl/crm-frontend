import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createClosingReason,
  deleteClosingReason,
  listClosingReasons,
  renameClosingReason,
} from './services';
import type { ClosingReasonKind } from './types';

export function useClosingReasonsQuery(kind: ClosingReasonKind, enabled = true) {
  return useQuery({
    queryKey: ['closing-reasons', kind],
    queryFn: () => listClosingReasons(kind),
    enabled,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['closing-reasons'] });
}

export function useCreateClosingReason(kind: ClosingReasonKind) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string) => createClosingReason(kind, name),
    onSuccess: invalidate,
  });
}

export function useRenameClosingReason() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) => renameClosingReason(input.id, input.name),
    onSuccess: invalidate,
  });
}

export function useDeleteClosingReason() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteClosingReason(id),
    onSuccess: invalidate,
  });
}
