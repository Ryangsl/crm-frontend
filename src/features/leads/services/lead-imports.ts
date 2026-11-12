import { apiGet, apiPostForm } from '@/services/api';
import type {
  LeadImport,
  LeadImportRow,
  LeadImportRowStatus,
  OffsetPage,
} from '../types/lead-import';

// D-096: o envio responde 202 com a importacao na fila; o processamento roda no backend.
export function importLeads(input: {
  file: File;
  sourceId: string;
  ownerId?: string;
}): Promise<LeadImport> {
  const form = new FormData();
  form.append('source_id', input.sourceId);
  if (input.ownerId) form.append('owner_id', input.ownerId);
  form.append('file', input.file);
  return apiPostForm<LeadImport>('/v1/leads/import', form);
}

export function listLeadImports(page = 1, limit = 20): Promise<OffsetPage<LeadImport>> {
  return apiGet<OffsetPage<LeadImport>>(`/v1/lead-imports?page=${page}&limit=${limit}`);
}

export function getLeadImport(id: string): Promise<LeadImport> {
  return apiGet<LeadImport>(`/v1/lead-imports/${id}`);
}

export function listLeadImportRows(
  id: string,
  params: { page?: number; limit?: number; status?: LeadImportRowStatus } = {},
): Promise<OffsetPage<LeadImportRow>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.status) query.set('status', params.status);
  return apiGet<OffsetPage<LeadImportRow>>(`/v1/lead-imports/${id}/rows?${query.toString()}`);
}
