import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getCustomer, listCustomers } from '../services/customers';
import type { ListCustomersParams } from '../services/customers';

export function useCustomersQuery(params: ListCustomersParams) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => listCustomers(params),
    // Mantem a pagina anterior visivel enquanto a proxima carrega — evita o layout
    // "piscar" para o estado de loading a cada troca de pagina/busca.
    placeholderData: keepPreviousData,
  });
}

export function useCustomerQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomer(id as string),
    enabled: Boolean(id),
  });
}
