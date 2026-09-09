import type { HealthResponse } from '../types/health';
import { apiGet } from './api';

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health', { signal });
}
