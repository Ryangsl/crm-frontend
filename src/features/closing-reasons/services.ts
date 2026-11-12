import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type { ClosingReason, ClosingReasonKind } from './types';

export function listClosingReasons(kind: ClosingReasonKind): Promise<{ data: ClosingReason[] }> {
  return apiGet<{ data: ClosingReason[] }>(`/v1/closing-reasons?kind=${kind}`);
}

export function createClosingReason(kind: ClosingReasonKind, name: string): Promise<ClosingReason> {
  return apiPost<ClosingReason>('/v1/closing-reasons', { kind, name });
}

export function renameClosingReason(id: string, name: string): Promise<ClosingReason> {
  return apiPatch<ClosingReason>(`/v1/closing-reasons/${id}`, { name });
}

// Exclusao logica: registros que ja usaram o motivo continuam com o nome gravado.
export function deleteClosingReason(id: string): Promise<void> {
  return apiDelete<void>(`/v1/closing-reasons/${id}`);
}
