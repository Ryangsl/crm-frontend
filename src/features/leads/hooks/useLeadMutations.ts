import type { ClosingReasonChoice } from '@/features/closing-reasons/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  convertLead,
  createLead,
  createLeadSource,
  deleteLead,
  deleteLeadSource,
  disqualifyLead,
  qualifyLead,
  renameLeadSource,
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
    mutationFn: (choice: ClosingReasonChoice) => disqualifyLead(id, choice),
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

// D-094: origens de Lead. Toda escrita atualiza o seletor do formulario de Lead.
function useInvalidateLeadSources() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
}

export function useCreateLeadSource() {
  const invalidate = useInvalidateLeadSources();
  return useMutation({
    mutationFn: (name: string) => createLeadSource(name),
    onSuccess: invalidate,
  });
}

export function useRenameLeadSource() {
  const invalidate = useInvalidateLeadSources();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameLeadSource(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteLeadSource() {
  const invalidate = useInvalidateLeadSources();
  return useMutation({ mutationFn: (id: string) => deleteLeadSource(id), onSuccess: invalidate });
}
