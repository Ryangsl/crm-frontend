import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getOpportunity,
  getPipeline,
  listOpportunities,
  listPipelineOpportunities,
  listPipelines,
} from '../services/opportunities';
import type { ListOpportunitiesParams } from '../services/opportunities';

export function useOpportunitiesQuery(params: ListOpportunitiesParams) {
  return useQuery({
    queryKey: ['opportunities', 'list', params],
    queryFn: () => listOpportunities(params),
    placeholderData: keepPreviousData,
  });
}

export function useOpportunityQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['opportunities', 'detail', id],
    queryFn: () => getOpportunity(id as string),
    enabled: Boolean(id),
  });
}

// Kanban: limite maximo da API (100). Acima disso o quadro mostra so as 100 mais recentes.
export const BOARD_LIMIT = 100;

export function usePipelineOpportunitiesQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['opportunities', 'pipeline', pipelineId],
    queryFn: () => listPipelineOpportunities(pipelineId as string, { limit: BOARD_LIMIT }),
    enabled: Boolean(pipelineId),
  });
}

export function usePipelinesQuery() {
  return useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
}

export function usePipelineQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => getPipeline(id as string),
    enabled: Boolean(id),
  });
}
