import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';

// Sem WebSocket na Fase 4 (D-013): polling de 30 s, como a disponibilidade e o /status.
export const NOTIFICATIONS_POLL_MS = 30_000;

const ROOT_KEY = ['notifications'];
const COUNT_KEY = [...ROOT_KEY, 'unread-count'];
const LIST_KEY = [...ROOT_KEY, 'list'];

export function useUnreadCountQuery(enabled: boolean) {
  return useQuery({
    queryKey: COUNT_KEY,
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    select: (response) => response.count,
  });
}

// A lista so e carregada com o painel aberto (e atualizada pelo mesmo polling enquanto aberto).
export function useNotificationsQuery(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: LIST_KEY,
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ROOT_KEY });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void invalidate();
    },
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void invalidate();
    },
  });
}
