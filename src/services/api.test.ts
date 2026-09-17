import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiBaseUrl, apiGet, setAccessToken, setUnauthorizedHandler } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('anexa Authorization quando ha access token e a rota nao e de auth', async () => {
    setAccessToken('token-123');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiGet('/v1/customers');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('nao anexa Authorization nem tenta refresh em rotas de /v1/auth', async () => {
    setAccessToken('token-123');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'x' } }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/v1/auth/login')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has('Authorization')).toBe(false);
  });

  it('em 401 fora de /v1/auth, tenta refresh uma unica vez e repete a requisicao original', async () => {
    setAccessToken('expired');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'fresh', expires_in: 900 }))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet<{ id: string }>('/v1/users/me');

    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/v1/auth/refresh');
    const [, retryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect((retryInit.headers as Headers).get('Authorization')).toBe('Bearer fresh');
  });

  it('encerra a sessao (via setUnauthorizedHandler) quando o refresh falha apos 401', async () => {
    setAccessToken('expired');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'y' } }, 401),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/v1/users/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    // Nao deve tentar refresh de novo alem da unica tentativa (sem loop).
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deduplica refreshes concorrentes: dois 401 simultaneos disparam so um POST /v1/auth/refresh', async () => {
    setAccessToken('expired');
    const callCounts = new Map<string, number>();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const count = (callCounts.get(url) ?? 0) + 1;
      callCounts.set(url, count);

      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ access_token: 'fresh', expires_in: 900 }));
      }
      return Promise.resolve(
        count === 1
          ? jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401)
          : jsonResponse({ ok: true }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([apiGet('/a'), apiGet('/b')]);

    expect(callCounts.get(`${apiBaseUrl}/v1/auth/refresh`)).toBe(1);
  });

  it('trata 204 sem corpo como sucesso vazio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/v1/auth/logout')).resolves.toBeUndefined();
  });
});
