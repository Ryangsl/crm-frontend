import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api';
import type {
  AccessException,
  AccessExceptionListResponse,
  AccessExceptionUsersResponse,
  AccessStatus,
  CreateAccessExceptionInput,
  ListAccessExceptionsParams,
  RestrictionSetting,
} from '../types/accessControl';

export function getAccessStatus(): Promise<AccessStatus> {
  return apiGet<AccessStatus>('/v1/access-status');
}

// Toggle global da restricao por horario: so o Admin altera (tenant_settings:update).
export function getRestrictionSetting(): Promise<RestrictionSetting> {
  return apiGet<RestrictionSetting>('/v1/tenant-settings/business-hours-restriction');
}

export function setRestrictionSetting(enabled: boolean): Promise<RestrictionSetting> {
  return apiPut<RestrictionSetting>('/v1/tenant-settings/business-hours-restriction', { enabled });
}

export function listAccessExceptions(
  params: ListAccessExceptionsParams = {},
): Promise<AccessExceptionListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.active !== undefined) query.set('active', String(params.active));
  const qs = query.toString();
  return apiGet<AccessExceptionListResponse>(`/v1/access-exceptions${qs ? `?${qs}` : ''}`);
}

export function createAccessException(input: CreateAccessExceptionInput): Promise<AccessException> {
  return apiPost<AccessException>('/v1/access-exceptions', input);
}

// Revoga antecipadamente (nao apaga o registro).
export function revokeAccessException(id: string): Promise<AccessException> {
  return apiDelete<AccessException>(`/v1/access-exceptions/${id}`);
}

// Usuarios do tenant para escolher o destinatario (exige `users:read`; o backend valida se o
// usuario e sujeito a restricao na concessao).
export function listExceptionUsers(): Promise<AccessExceptionUsersResponse> {
  return apiGet<AccessExceptionUsersResponse>('/v1/users?page=1&limit=100');
}
