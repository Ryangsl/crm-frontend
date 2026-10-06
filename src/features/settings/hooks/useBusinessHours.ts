import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBusinessHours, saveBusinessHours } from '../services/businessHours';
import type { BusinessHours } from '../types/businessHours';

const QUERY_KEY = ['tenant-settings', 'business-hours'];

export function useBusinessHoursQuery(enabled: boolean) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getBusinessHours, enabled });
}

export function useSaveBusinessHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessHours) => saveBusinessHours(input),
    // A resposta do PUT ja traz o valor persistido (forma canonica): reflete na tela sem
    // depender de um novo GET.
    onSuccess: (response) => {
      queryClient.setQueryData(QUERY_KEY, response);
    },
  });
}
