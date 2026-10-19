import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccessException,
  getAccessStatus,
  getRestrictionSetting,
  listAccessExceptions,
  listExceptionUsers,
  revokeAccessException,
  setRestrictionSetting,
} from '../services/accessControl';
import type {
  CreateAccessExceptionInput,
  ListAccessExceptionsParams,
} from '../types/accessControl';

// Sem WebSocket na Fase 4 (D-013): o status e reconsultado a cada minuto para o banner refletir a
// virada do horario sem recarregar a pagina.
export const ACCESS_STATUS_POLL_MS = 60_000;

const STATUS_KEY = ['access-status'];
const SETTING_KEY = ['tenant-settings', 'business-hours-restriction'];
const EXCEPTIONS_KEY = ['access-exceptions'];

export function useAccessStatusQuery(enabled = true) {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: getAccessStatus,
    enabled,
    refetchInterval: ACCESS_STATUS_POLL_MS,
  });
}

export function useRestrictionSettingQuery(enabled: boolean) {
  return useQuery({ queryKey: SETTING_KEY, queryFn: getRestrictionSetting, enabled });
}

export function useSetRestriction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setRestrictionSetting(enabled),
    onSuccess: (response) => {
      queryClient.setQueryData(SETTING_KEY, response);
      // O estado de acesso do proprio usuario pode ter mudado com o toggle.
      void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
  });
}

export function useAccessExceptionsQuery(params: ListAccessExceptionsParams, enabled: boolean) {
  return useQuery({
    queryKey: [...EXCEPTIONS_KEY, 'list', params],
    queryFn: () => listAccessExceptions(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useExceptionUsersQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'access-exceptions'],
    queryFn: listExceptionUsers,
    enabled,
    select: (response) => response.data.filter((user) => user.status === 'active'),
  });
}

function useInvalidateExceptions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: EXCEPTIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
  };
}

export function useCreateAccessException() {
  const invalidate = useInvalidateExceptions();
  return useMutation({
    mutationFn: (input: CreateAccessExceptionInput) => createAccessException(input),
    onSuccess: invalidate,
  });
}

export function useRevokeAccessException() {
  const invalidate = useInvalidateExceptions();
  return useMutation({
    mutationFn: (id: string) => revokeAccessException(id),
    onSuccess: invalidate,
  });
}
