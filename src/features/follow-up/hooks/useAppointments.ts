import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createAppointment, deleteAppointment, listAppointments, updateAppointment } from '../services/followUp';
import type {
  AppointmentCreateInput,
  AppointmentUpdateInput,
  CrmEntityType,
} from '../types/followUp';

function queryKey(entityType: CrmEntityType, entityId: string) {
  return ['follow-up', 'appointments', entityType, entityId];
}

export function useAppointmentsQuery(entityType: CrmEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKey(entityType, entityId as string),
    queryFn: () => listAppointments(entityType, entityId as string),
    enabled: Boolean(entityId),
    select: (response) => response.data,
  });
}

export function useCreateAppointment(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AppointmentCreateInput) => createAppointment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useUpdateAppointment(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string;
      input: AppointmentUpdateInput;
    }) => updateAppointment(appointmentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useDeleteAppointment(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => deleteAppointment(appointmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}
