import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBrandingRequest,
  dismissBrandingRequest,
  getBranding,
  getBrandingRequest,
  resetBrandingToDefault,
  updateBranding,
} from '../services/branding';
import type { BrandingInput, BrandingRequestInput } from '../types/branding';

export const BRANDING_KEY = ['branding'];
export const BRANDING_REQUEST_KEY = ['branding', 'request'];

export function useBrandingQuery(enabled = true) {
  return useQuery({ queryKey: BRANDING_KEY, queryFn: getBranding, enabled });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandingInput) => updateBranding(input),
    // Atualiza o cache: a identidade nova vale na hora, sem recarregar a aplicacao. Aplicar atende a
    // solicitacao pendente, entao ela e reconsultada.
    onSuccess: (branding) => {
      queryClient.setQueryData(BRANDING_KEY, branding);
      void queryClient.invalidateQueries({ queryKey: BRANDING_REQUEST_KEY });
    },
  });
}

export function useResetBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetBrandingToDefault,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANDING_KEY }),
  });
}

export function useBrandingRequestQuery(enabled = true) {
  return useQuery({ queryKey: BRANDING_REQUEST_KEY, queryFn: getBrandingRequest, enabled });
}

export function useCreateBrandingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandingRequestInput) => createBrandingRequest(input),
    onSuccess: (state) => queryClient.setQueryData(BRANDING_REQUEST_KEY, state),
  });
}

export function useDismissBrandingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissBrandingRequest,
    onSuccess: () => queryClient.setQueryData(BRANDING_REQUEST_KEY, { pending: null }),
  });
}
