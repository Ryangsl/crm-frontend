import { apiGet, apiPut } from '@/services/api';
import type { BusinessHours, BusinessHoursResponse } from '../types/businessHours';

export function getBusinessHours(): Promise<BusinessHoursResponse> {
  return apiGet<BusinessHoursResponse>('/v1/tenant-settings/business-hours');
}

export function saveBusinessHours(input: BusinessHours): Promise<BusinessHoursResponse> {
  return apiPut<BusinessHoursResponse>('/v1/tenant-settings/business-hours', input);
}
