import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getLead, listLeads, listLeadSources } from '../services/leads';
import type { ListLeadsParams } from '../services/leads';

export function useLeadsQuery(params: ListLeadsParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => listLeads(params),
    placeholderData: keepPreviousData,
  });
}

export function useLeadQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => getLead(id as string),
    enabled: Boolean(id),
  });
}

// Origens sao poucas por tenant — uma pagina de ate 100 basta para popular o seletor do
// formulario, sem paginacao propria na UI.
export function useLeadSourcesQuery() {
  return useQuery({
    queryKey: ['lead-sources', 'all'],
    queryFn: () => listLeadSources({ limit: 100 }),
  });
}
