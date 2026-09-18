import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type {
  ConvertLeadInput,
  Lead,
  LeadInput,
  LeadListResponse,
  LeadSourceListResponse,
} from '../types/lead';

export interface ListLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  owner_id?: string;
  source_id?: string;
}

export function listLeads(params: ListLeadsParams = {}): Promise<LeadListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.owner_id) query.set('owner_id', params.owner_id);
  if (params.source_id) query.set('source_id', params.source_id);
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

export function disqualifyLead(id: string, reason: string): Promise<Lead> {
  return apiPost<Lead>(`/v1/leads/${id}/disqualify`, { reason });
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
