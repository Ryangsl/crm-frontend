import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  assignConversation,
  closeConversation,
  createConversation,
  createMessage,
  getConversation,
  listAssignees,
  listConversations,
  listMessages,
  reopenConversation,
} from '../services/conversations';
import type {
  ConversationCreateInput,
  ListConversationsParams,
  MessageCreateInput,
} from '../types/conversations';

const ROOT = ['conversations'];

export function useConversationsQuery(params: ListConversationsParams, enabled = true) {
  return useQuery({
    queryKey: [...ROOT, 'list', params],
    queryFn: () => listConversations(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useConversationQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...ROOT, 'detail', id],
    queryFn: () => getConversation(id as string),
    enabled: Boolean(id),
  });
}

// Mensagens: a API devolve da mais recente para a mais antiga; "carregar anteriores" busca a
// proxima pagina pelo cursor opaco.
export function useMessagesQuery(conversationId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...ROOT, 'messages', conversationId],
    queryFn: ({ pageParam }) => listMessages(conversationId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: enabled && Boolean(conversationId),
  });
}

// Lista de possiveis responsaveis: so e consultada por quem tem `users:read`.
export function useAssigneesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'assignees'],
    queryFn: listAssignees,
    enabled,
    select: (response) => response.data.filter((user) => user.status === 'active'),
  });
}

function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ROOT });
}

export function useCreateConversation() {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: (input: ConversationCreateInput) => createConversation(input),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useAssignConversation(id: string) {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: (userId: string | null) => assignConversation(id, userId),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useCloseConversation(id: string) {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: () => closeConversation(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useReopenConversation(id: string) {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: () => reopenConversation(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useCreateMessage(conversationId: string) {
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: (input: MessageCreateInput) => createMessage(conversationId, input),
    onSuccess: () => {
      void invalidate();
    },
  });
}
