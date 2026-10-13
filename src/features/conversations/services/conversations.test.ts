import { afterEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/services/api';
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
} from './conversations';

vi.mock('@/services/api');

describe('conversations service', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('lista conversas com filtros na query string', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [] });

    await listConversations();
    expect(api.apiGet).toHaveBeenLastCalledWith('/v1/conversations');

    await listConversations({
      page: 2,
      limit: 20,
      status: 'open',
      unassigned: true,
      customer_id: 'c1',
      lead_id: 'l1',
      opportunity_id: 'o1',
    });
    expect(api.apiGet).toHaveBeenLastCalledWith(
      '/v1/conversations?page=2&limit=20&status=open&unassigned=true&customer_id=c1&lead_id=l1&opportunity_id=o1',
    );
  });

  it('obtem, cria, atribui, encerra e reabre pelas rotas do core', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({});
    vi.mocked(api.apiPost).mockResolvedValue({});

    await getConversation('c1');
    await createConversation({ lead_id: 'l1' });
    await assignConversation('c1', 'u1');
    await assignConversation('c1', null);
    await closeConversation('c1');
    await reopenConversation('c1');

    expect(api.apiGet).toHaveBeenCalledWith('/v1/conversations/c1');
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations', { lead_id: 'l1' });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations/c1/assign', { user_id: 'u1' });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations/c1/assign', { user_id: null });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations/c1/close');
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations/c1/reopen');
  });

  it('mensagens: lista com limit e cursor opaco codificado; registra pela sub-rota', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [], next_cursor: null });
    vi.mocked(api.apiPost).mockResolvedValue({});

    await listMessages('c1');
    expect(api.apiGet).toHaveBeenLastCalledWith('/v1/conversations/c1/messages?limit=20');
    await listMessages('c1', 'a+b/c=');
    expect(api.apiGet).toHaveBeenLastCalledWith(
      '/v1/conversations/c1/messages?limit=20&cursor=a%2Bb%2Fc%3D',
    );

    await createMessage('c1', { content: 'oi', direction: 'inbound' });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/conversations/c1/messages', {
      content: 'oi',
      direction: 'inbound',
    });
  });

  it('lista possiveis responsaveis em /v1/users', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [] });
    await listAssignees();
    expect(api.apiGet).toHaveBeenCalledWith('/v1/users?page=1&limit=100');
  });
});
