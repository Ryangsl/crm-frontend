import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAvailabilitySetting,
  getMyAvailability,
  listAvailability,
  setAvailabilitySetting,
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

const SETTING_KEY = ['tenant-settings', 'availability'];

export function useAvailabilitySettingQuery(enabled: boolean) {
  return useQuery({ queryKey: SETTING_KEY, queryFn: getAvailabilitySetting, enabled });
}

// Ligar/desligar muda o seletor, o menu e a tela da equipe (todos leem `availability/me`).
export function useSetAvailabilitySetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setAvailabilitySetting(enabled),
    onSuccess: (response) => {
      queryClient.setQueryData(SETTING_KEY, response);
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
