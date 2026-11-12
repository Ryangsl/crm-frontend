import type { ClosingReasonChoice } from '@/features/closing-reasons/types';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type {
  MoveInput,
  Opportunity,
  OpportunityCreateInput,
  OpportunityListResponse,
  OpportunityUpdateInput,
  Pipeline,
  PipelineListResponse,
  StageHistoryPage,
} from '../types/opportunity';

export interface ListOpportunitiesParams {
  page?: number;
  limit?: number;
  pipeline_id?: string;
  stage_id?: string;
  owner_id?: string;
  customer_id?: string;
  status?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export function listOpportunities(params: ListOpportunitiesParams = {}) {
  return apiGet<OpportunityListResponse>(`/v1/opportunities${toQuery({ ...params })}`);
}

// Alimenta o Kanban (contrato ja documentado: GET /pipelines/{id}/opportunities).
export function listPipelineOpportunities(
  pipelineId: string,
  params: { page?: number; limit?: number; stage_id?: string; status?: string } = {},
) {
  return apiGet<OpportunityListResponse>(
    `/v1/pipelines/${pipelineId}/opportunities${toQuery({ ...params })}`,
  );
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return apiGet<Opportunity>(`/v1/opportunities/${id}`);
}

export function createOpportunity(input: OpportunityCreateInput): Promise<Opportunity> {
  return apiPost<Opportunity>('/v1/opportunities', input);
}

export function updateOpportunity(id: string, input: OpportunityUpdateInput): Promise<Opportunity> {
  return apiPatch<Opportunity>(`/v1/opportunities/${id}`, input);
}

export function deleteOpportunity(id: string): Promise<void> {
  return apiDelete<void>(`/v1/opportunities/${id}`);
}

export function moveOpportunity(id: string, input: MoveInput): Promise<Opportunity> {
  return apiPost<Opportunity>(`/v1/opportunities/${id}/move`, input);
}

export function winOpportunity(id: string): Promise<Opportunity> {
  return apiPost<Opportunity>(`/v1/opportunities/${id}/win`);
}

// D-099: motivo da lista da empresa + observacao (obrigatoria com "Outro").
export function loseOpportunity(id: string, choice: ClosingReasonChoice): Promise<Opportunity> {
  return apiPost<Opportunity>(`/v1/opportunities/${id}/lose`, choice);
}

export function listPipelines(): Promise<PipelineListResponse> {
  return apiGet<PipelineListResponse>('/v1/pipelines?limit=100');
}

export function getPipeline(id: string): Promise<Pipeline> {
  return apiGet<Pipeline>(`/v1/pipelines/${id}`);
}

// Cursor opaco (`next_cursor`): repassado como veio, nunca montado aqui.
export function listStageHistory(id: string, cursor?: string): Promise<StageHistoryPage> {
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', cursor);
  return apiGet<StageHistoryPage>(`/v1/opportunities/${id}/stage-history?${query.toString()}`);
}
