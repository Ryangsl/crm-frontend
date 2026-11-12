import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type { ClosingReasonChoice } from '@/features/closing-reasons/types';
import type {
  ConvertLeadInput,
  Lead,
  LeadInput,
  LeadSource,
  LeadListResponse,
  LeadSourceListResponse,
} from '../types/lead';

export interface ListLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  owner_id?: string;
  unassigned?: true;
  source_id?: string;
  q?: string;
}

export function listLeads(params: ListLeadsParams = {}): Promise<LeadListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.unassigned) query.set('unassigned', 'true');
  else if (params.owner_id) query.set('owner_id', params.owner_id);
  if (params.source_id) query.set('source_id', params.source_id);
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return apiGet<LeadListResponse>(`/v1/leads${qs ? `?${qs}` : ''}`);
}

export function getLead(id: string): Promise<Lead> {
  return apiGet<Lead>(`/v1/leads/${id}`);
}

export function createLead(input: LeadInput): Promise<Lead> {
  return apiPost<Lead>('/v1/leads', input);
}

export function updateLead(id: string, input: Partial<LeadInput>): Promise<Lead> {
  return apiPatch<Lead>(`/v1/leads/${id}`, input);
}

export function deleteLead(id: string): Promise<void> {
  return apiDelete<void>(`/v1/leads/${id}`);
}

export function qualifyLead(id: string): Promise<Lead> {
  return apiPost<Lead>(`/v1/leads/${id}/qualify`);
}

// D-099: motivo da lista da empresa + observacao (obrigatoria com "Outro").
export function disqualifyLead(id: string, choice: ClosingReasonChoice): Promise<Lead> {
  return apiPost<Lead>(`/v1/leads/${id}/disqualify`, choice);
}

export function reopenLead(id: string): Promise<Lead> {
  return apiPost<Lead>(`/v1/leads/${id}/reopen`);
}

export function convertLead(id: string, input: ConvertLeadInput): Promise<Lead> {
  return apiPost<Lead>(`/v1/leads/${id}/convert`, input);
}

export function listLeadSources(
  params: { page?: number; limit?: number } = {},
): Promise<LeadSourceListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiGet<LeadSourceListResponse>(`/v1/lead-sources${qs ? `?${qs}` : ''}`);
}

// D-094: cadastro de origens pelo Admin (Configuracoes > Origens de Lead).
export function createLeadSource(name: string): Promise<LeadSource> {
  return apiPost<LeadSource>('/v1/lead-sources', { name });
}

export function renameLeadSource(id: string, name: string): Promise<LeadSource> {
  return apiPatch<LeadSource>(`/v1/lead-sources/${id}`, { name });
}

// Desativacao (soft delete): leads que ja usam a origem continuam com ela.
export function deleteLeadSource(id: string): Promise<void> {
  return apiDelete<void>(`/v1/lead-sources/${id}`);
}
