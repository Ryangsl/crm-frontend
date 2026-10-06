import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyAvailability,
  listAvailability,
  setMyAvailability,
  setUserAvailability,
} from '../services/availability';
import type { AvailabilityStatus, ListAvailabilityParams } from '../types/availability';

// Reflete mudancas feitas por outra pessoa (ex.: gestor colocando em Treinamento). Sem
// WebSocket na Fase 4 (D-013): polling, no mesmo espirito do `useHealth`.
const POLL_MS = 30_000;

const ME_KEY = ['availability', 'me'];

export function useMyAvailabilityQuery(enabled: boolean) {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: getMyAvailability,
    enabled,
    refetchInterval: POLL_MS,
  });
}

export function useSetMyAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: AvailabilityStatus) => setMyAvailability(status),
    onSuccess: (response) => {
      queryClient.setQueryData(ME_KEY, response);
    },
    // 409 (mecanismo desabilitado) ou 403 (Treinamento): o servidor e a autoridade — recarrega.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

export function useAvailabilityListQuery(params: ListAvailabilityParams, enabled: boolean) {
  return useQuery({
    queryKey: ['availability', 'list', params],
    queryFn: () => listAvailability(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

export function useSetUserAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: Extract<AvailabilityStatus, 'training' | 'unavailable'>;
    }) => setUserAvailability(userId, status),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability', 'list'] });
    },
  });
}
