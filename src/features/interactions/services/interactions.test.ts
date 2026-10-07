import { afterEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/services/api';
import { createInteraction, deleteInteraction, listTimeline } from './interactions';

vi.mock('@/services/api');

describe('interactions service', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ['customer', 'customers'],
    ['lead', 'leads'],
    ['opportunity', 'opportunities'],
  ] as const)('timeline de %s usa a rota /%s/:id/interactions com cursor', async (type, path) => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [], next_cursor: null, has_more: false });

    await listTimeline(type, 'e1');
    expect(api.apiGet).toHaveBeenLastCalledWith(`/v1/${path}/e1/interactions?limit=20`);

    await listTimeline(type, 'e1', 'abc_DEF-123');
    expect(api.apiGet).toHaveBeenLastCalledWith(
      `/v1/${path}/e1/interactions?limit=20&cursor=abc_DEF-123`,
    );
  });

  it('o cursor opaco e codificado na URL', async () => {
    vi.mocked(api.apiGet).mockResolvedValue({ data: [], next_cursor: null, has_more: false });
    await listTimeline('lead', 'e1', 'a+b/c=');
    expect(api.apiGet).toHaveBeenLastCalledWith(
      '/v1/leads/e1/interactions?limit=20&cursor=a%2Bb%2Fc%3D',
    );
  });

  it('cria e exclui pela rota /interactions', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({});
    vi.mocked(api.apiDelete).mockResolvedValue(undefined);
    const input = {
      entity_type: 'customer' as const,
      entity_id: 'c1',
      channel: 'telefone',
      summary: 's',
    };

    await createInteraction(input);
    await deleteInteraction('i1');

    expect(api.apiPost).toHaveBeenCalledWith('/v1/interactions', input);
    expect(api.apiDelete).toHaveBeenCalledWith('/v1/interactions/i1');
  });
});
