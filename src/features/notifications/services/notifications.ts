import { apiGet, apiPost } from '@/services/api';
import type {
  AppNotification,
  NotificationPage,
  ReadAllResult,
  UnreadCount,
} from '../types/notifications';

const PAGE_SIZE = 20;

// Cursor opaco devolvido pelo backend em `next_cursor`: nunca montado no cliente.
export function listNotifications(cursor?: string): Promise<NotificationPage> {
  const query = `limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  return apiGet<NotificationPage>(`/v1/notifications?${query}`);
}

export function getUnreadCount(): Promise<UnreadCount> {
  return apiGet<UnreadCount>('/v1/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiPost<AppNotification>(`/v1/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<ReadAllResult> {
  return apiPost<ReadAllResult>('/v1/notifications/read-all');
}
