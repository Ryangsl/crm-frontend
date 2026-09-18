import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  convertLead,
  createLead,
  deleteLead,
  disqualifyLead,
  qualifyLead,
  reopenLead,
  updateLead,
} from '../services/leads';
import type { ConvertLeadInput, LeadInput } from '../types/lead';

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadInput) => createLead(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LeadInput>) => updateLead(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useQualifyLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => qualifyLead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDisqualifyLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => disqualifyLead(id, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useReopenLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reopenLead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useConvertLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConvertLeadInput) => convertLead(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}
