import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getLeadImport,
  importLeads,
  listLeadImportRows,
  listLeadImports,
} from '../services/lead-imports';
import type { LeadImport, LeadImportRowStatus } from '../types/lead-import';

// Enquanto a importacao esta na fila ou rodando, a tela consulta o andamento a cada 2 s.
export const LEAD_IMPORT_POLL_MS = 2000;

export function isLeadImportRunning(record: Pick<LeadImport, 'status'> | undefined): boolean {
  return record?.status === 'queued' || record?.status === 'processing';
}

export function useLeadImportsQuery(page: number) {
  return useQuery({
    queryKey: ['lead-imports', 'list', page],
    queryFn: () => listLeadImports(page),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data.some(isLeadImportRunning) ? LEAD_IMPORT_POLL_MS : false,
  });
}

export function useLeadImportQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['lead-imports', 'detail', id],
    queryFn: () => getLeadImport(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      isLeadImportRunning(query.state.data) ? LEAD_IMPORT_POLL_MS : false,
  });
}

// `processed` entra na chave: cada avanco do processamento busca as linhas de novo.
export function useLeadImportRowsQuery(
  id: string | undefined,
  params: { page: number; status?: LeadImportRowStatus; processed: number },
) {
  return useQuery({
    queryKey: ['lead-imports', 'rows', id, params],
    queryFn: () =>
      listLeadImportRows(id as string, { page: params.page, status: params.status, limit: 50 }),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof importLeads>[0]) => importLeads(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lead-imports', 'list'] });
    },
  });
}

// Quando uma importacao termina, a lista de Leads em cache esta desatualizada.
export function useInvalidateLeadsOnFinish() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['leads'] });
  };
}
