import { afterEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/services/api';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications';

vi.mock('@/services/api');

describe('notifications service', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lista com limit e, quando houver, o cursor opaco codificado na URL', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [], next_cursor: null });

    await listNotifications();
    expect(api.apiGet).toHaveBeenLastCalledWith('/v1/notifications?limit=20');

    await listNotifications('a+b/c=');
    expect(api.apiGet).toHaveBeenLastCalledWith('/v1/notifications?limit=20&cursor=a%2Bb%2Fc%3D');
  });

  it('conta nao lidas, marca uma como lida e marca todas', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ count: 1 });
    vi.mocked(api.apiPost).mockResolvedValue({});

    await getUnreadCount();
    await markNotificationRead('n1');
    await markAllNotificationsRead();

    expect(api.apiGet).toHaveBeenCalledWith('/v1/notifications/unread-count');
    expect(api.apiPost).toHaveBeenCalledWith('/v1/notifications/n1/read');
    expect(api.apiPost).toHaveBeenCalledWith('/v1/notifications/read-all');
  });
});
