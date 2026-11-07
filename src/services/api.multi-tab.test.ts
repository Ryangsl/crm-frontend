import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// D-091: renovacao de sessao com varias abas. Cada "aba" e uma instancia propria do modulo
// services/api (estado em memoria separado), todas compartilhando o mesmo cookie e o mesmo
// LockManager, como abas reais da mesma origem.

type ApiModule = typeof import('./api');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Servidor com a regra do backend (D-056): o refresh e consumido uma vez; reapresentar um token ja
// rotacionado revoga a familia inteira. O cookie (unico no navegador) muda a cada rotacao.
function fakeServer(latencyMs = 5) {
  let generation = 1;
  const rotated = new Set<number>();
  const state = { cookie: 1, familyRevoked: false, refreshCalls: 0 };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.endsWith('/v1/auth/refresh')) return jsonResponse({ ok: true });
    state.refreshCalls += 1;
    const presented = state.cookie; // o navegador envia o cookie atual no momento do envio
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    if (state.familyRevoked || rotated.has(presented)) {
      state.familyRevoked = true;
      return jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, 401);
    }
    rotated.add(presented);
    generation += 1;
    state.cookie = generation;
    return jsonResponse({ access_token: `access-${generation}`, expires_in: 900 });
  });
  return { state, fetchMock };
}

// LockManager minimo: um pedido exclusivo por nome de cada vez, em ordem.
function fakeLocks() {
  const queues = new Map<string, Promise<unknown>>();
  const names: string[] = [];
  return {
    names,
    request: vi.fn((name: string, _options: unknown, task: () => Promise<unknown>) => {
      names.push(name);
      const previous = queues.get(name) ?? Promise.resolve();
      const run = previous.then(task, task);
      queues.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    }),
  };
}

async function openTab(): Promise<ApiModule> {
  vi.resetModules();
  return import('./api');
}

describe('renovacao com varias abas (D-091)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('duas abas renovando ao mesmo tempo: as duas ficam com sessao valida, sem reuso detectado', async () => {
    const { state, fetchMock } = fakeServer();
    const locks = fakeLocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { ...navigator, locks });

    const tabA = await openTab();
    const tabB = await openTab();
    const [tokenA, tokenB] = await Promise.all([
      tabA.refreshAccessToken(),
      tabB.refreshAccessToken(),
    ]);

    expect(tokenA).toMatch(/^access-/);
    expect(tokenB).toMatch(/^access-/);
    expect(tokenA).not.toBe(tokenB);
    expect(state.familyRevoked).toBe(false);
    expect(locks.names).toEqual([tabA.REFRESH_LOCK_NAME, tabB.REFRESH_LOCK_NAME]);
    expect(tabA.getAccessToken()).toBe(tokenA);
    expect(tabB.getAccessToken()).toBe(tokenB);
  });

  it('sem a coordenacao, a segunda aba reapresentaria o token velho e derrubaria a sessao', async () => {
    // Documenta o defeito que o Web Lock evita (navegador sem Web Locks cai neste caminho).
    const { state, fetchMock } = fakeServer();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { ...navigator, locks: undefined });

    const tabA = await openTab();
    const tabB = await openTab();
    const tokens = await Promise.all([tabA.refreshAccessToken(), tabB.refreshAccessToken()]);

    expect(tokens.filter(Boolean)).toHaveLength(1);
    expect(state.familyRevoked).toBe(true);
  });

  it('na mesma aba, pedidos simultaneos dividem uma unica renovacao', async () => {
    const { state, fetchMock } = fakeServer();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { ...navigator, locks: fakeLocks() });

    const tab = await openTab();
    const results = await Promise.all([
      tab.refreshAccessToken(),
      tab.refreshAccessToken(),
      tab.refreshAccessToken(),
    ]);

    expect(new Set(results).size).toBe(1);
    expect(state.refreshCalls).toBe(1);
  });

  it('falha na renovacao devolve null e libera o lock para a proxima aba continuar', async () => {
    const { state, fetchMock } = fakeServer();
    const locks = fakeLocks();
    vi.stubGlobal('navigator', { ...navigator, locks });
    let failNext = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (failNext) {
          failNext = false;
          throw new TypeError('Failed to fetch');
        }
        return fetchMock(input, init);
      }),
    );

    const tabA = await openTab();
    const tabB = await openTab();
    const [tokenA, tokenB] = await Promise.all([
      tabA.refreshAccessToken(),
      tabB.refreshAccessToken(),
    ]);

    expect(tokenA).toBeNull();
    expect(tokenB).toMatch(/^access-/);
    expect(state.familyRevoked).toBe(false);
    // A aba que falhou retoma na tentativa seguinte, com o cookie atual.
    await expect(tabA.refreshAccessToken()).resolves.toMatch(/^access-/);
    expect(state.familyRevoked).toBe(false);
  });

  it('renovacao sem resposta e abortada pelo limite de tempo, sem prender o lock', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('navigator', { ...navigator, locks: fakeLocks() });
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_input: RequestInfo | URL, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
              );
            }),
        ),
      );
      const tab = await openTab();
      const pending = tab.refreshAccessToken();
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
