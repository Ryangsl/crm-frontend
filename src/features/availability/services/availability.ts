import { apiGet, apiPut } from '@/services/api';
import type {
  AvailabilityListResponse,
  AvailabilityStatus,
  ListAvailabilityParams,
  AvailabilitySetting,
  MyAvailability,
} from '../types/availability';

export function getMyAvailability(): Promise<MyAvailability> {
  return apiGet<MyAvailability>('/v1/availability/me');
}

export function setMyAvailability(status: AvailabilityStatus): Promise<MyAvailability> {
  return apiPut<MyAvailability>('/v1/availability/me', { status });
}

export function listAvailability(
  params: ListAvailabilityParams = {},
): Promise<AvailabilityListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<AvailabilityListResponse>(`/v1/availability${qs ? `?${qs}` : ''}`);
}

// Via de terceiros (Admin/Gerente): so `training` (colocar) e `unavailable` (retirar).
export function setUserAvailability(
  userId: string,
  status: Extract<AvailabilityStatus, 'training' | 'unavailable'>,
): Promise<MyAvailability> {
  return apiPut<MyAvailability>(`/v1/users/${userId}/availability`, { status });
}

// Mecanismo de disponibilidade da empresa (`crm.availability.enabled`, F4.1/F4.2, D-071/D-077).
// Leitura com `tenant_settings:read`; so o Admin (`tenant_settings:update`) liga ou desliga.
export function getAvailabilitySetting(): Promise<AvailabilitySetting> {
  return apiGet<AvailabilitySetting>('/v1/tenant-settings/availability');
}

export function setAvailabilitySetting(enabled: boolean): Promise<AvailabilitySetting> {
  return apiPut<AvailabilitySetting>('/v1/tenant-settings/availability', { enabled });
}
