import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api';
import type {
  Branding,
  BrandingInput,
  BrandingRequestInput,
  BrandingRequestState,
} from '../types/branding';

export function getBranding(): Promise<Branding> {
  return apiGet<Branding>('/v1/branding');
}

export function updateBranding(input: BrandingInput): Promise<Branding> {
  return apiPut<Branding>('/v1/branding', input);
}

export function resetBrandingToDefault(): Promise<void> {
  return apiDelete<void>('/v1/branding');
}

export function getBrandingRequest(): Promise<BrandingRequestState> {
  return apiGet<BrandingRequestState>('/v1/branding/request');
}

export function createBrandingRequest(input: BrandingRequestInput): Promise<BrandingRequestState> {
  return apiPost<BrandingRequestState>('/v1/branding/request', input);
}

export function dismissBrandingRequest(): Promise<void> {
  return apiDelete<void>('/v1/branding/request');
}
