import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createContact, deleteContact, listContacts, updateContact } from '../services/customers';
import type { ContactInput } from '../types/customer';

export function useContactsQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customers', customerId, 'contacts'],
    queryFn: () => listContacts(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCreateContact(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) => createContact(customerId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
    },
  });
}

export function useUpdateContact(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, input }: { contactId: string; input: Partial<ContactInput> }) =>
      updateContact(customerId, contactId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
    },
  });
}

export function useDeleteContact(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteContact(customerId, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'contacts'] });
    },
  });
}
