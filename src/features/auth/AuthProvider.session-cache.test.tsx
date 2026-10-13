import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { apiGet } from '@/services/api';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

/*
 * Isolamento do cache do TanStack Query entre sessoes (code review F4.5/F4.6, I-2).
 * Todo encerramento efetivo de sessao esvazia o cache e cancela consultas em andamento; renovar o
 * access token com sucesso nao e fim de sessao e nao pode limpar nada.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const UNAUTHORIZED = { error: { code: 'UNAUTHORIZED', message: 'x' } };

function newQueryClient() {
  // Mesmos defaults de producao que importam aqui: dado fresco por 30 s (sem refetch ao montar).
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
}

function Probe({ withBell = false }: { withBell?: boolean }) {
  const { status, user, login, logout } = useAuth();
  return (
    <MemoryRouter>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <button onClick={() => login('a@x.com', 'secret').catch(() => {})}>login A</button>
      <button onClick={() => login('b@x.com', 'secret').catch(() => {})}>login B</button>
      <button onClick={() => void logout()}>logout</button>
      {withBell && status === 'authenticated' && <NotificationBell />}
    </MemoryRouter>
  );
}

function renderApp(queryClient: QueryClient, withBell = false) {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe withBell={withBell} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const SEEDED_KEYS = [
  ['notifications', 'unread-count'],
  ['leads', 'list'],
  ['conversations', 'detail', 'c1'],
];

function seedCache(queryClient: QueryClient) {
  for (const key of SEEDED_KEYS) queryClient.setQueryData(key, { owner: 'sessao-anterior' });
}

function expectCacheEmpty(queryClient: QueryClient) {
  for (const key of SEEDED_KEYS) expect(queryClient.getQueryData(key)).toBeUndefined();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
}

// Sessao restaurada no mount (refresh inicial ok) como a usuaria "a@x.com".
function stubAuthenticatedBackend(extra?: (url: string) => Response | Promise<Response> | null) {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const custom = extra?.(url);
    if (custom) return Promise.resolve(custom);
    if (url.includes('/v1/auth/refresh')) {
      return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
    }
    if (url.includes('/v1/users/me')) {
      return Promise.resolve(
        jsonResponse({ id: '1', name: 'Ana', email: 'a@x.com', status: 'active' }),
      );
    }
    if (url.includes('/v1/auth/logout'))
      return Promise.resolve(new Response(null, { status: 204 }));
    return Promise.resolve(jsonResponse({}, 404));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AuthProvider — isolamento do cache entre sessoes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logout esvazia o cache e uma consulta em andamento nao o repopula depois', async () => {
    const user = userEvent.setup();
    stubAuthenticatedBackend();
    const queryClient = newQueryClient();
    renderApp(queryClient);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    seedCache(queryClient);
    const slow = deferred<{ owner: string }>();
    const inflight = queryClient
      .fetchQuery({ queryKey: ['notifications', 'slow'], queryFn: () => slow.promise })
      .catch(() => undefined);

    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expectCacheEmpty(queryClient);

    // A resposta do usuario anterior chega depois da limpeza: nao pode reaparecer no cache.
    slow.resolve({ owner: 'sessao-anterior' });
    await inflight;
    expect(queryClient.getQueryData(['notifications', 'slow'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('401 que sobrevive ao refresh (sessao expirada) encerra a sessao e esvazia o cache', async () => {
    // O refresh inicial (restauracao da sessao) funciona; a renovacao seguinte falha de forma
    // definitiva, como numa sessao expirada.
    let refreshes = 0;
    stubAuthenticatedBackend((url) => {
      if (url.includes('/v1/leads')) return jsonResponse(UNAUTHORIZED, 401);
      if (url.includes('/v1/auth/refresh')) {
        refreshes += 1;
        if (refreshes > 1) return jsonResponse(UNAUTHORIZED, 401);
      }
      return null;
    });

    const queryClient = newQueryClient();
    renderApp(queryClient);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    seedCache(queryClient);

    await expect(apiGet('/v1/leads')).rejects.toMatchObject({ status: 401 });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expectCacheEmpty(queryClient);
  });

  it('renovacao bem-sucedida do access token NAO limpa o cache nem encerra a sessao', async () => {
    let leadsCalls = 0;
    stubAuthenticatedBackend((url) => {
      if (url.includes('/v1/leads')) {
        leadsCalls += 1;
        // Primeira chamada: token expirado (401); o retry automatico, apos o refresh, funciona.
        return leadsCalls === 1 ? jsonResponse(UNAUTHORIZED, 401) : jsonResponse({ data: [] });
      }
      return null;
    });
    const queryClient = newQueryClient();
    renderApp(queryClient);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    seedCache(queryClient);

    await expect(apiGet('/v1/leads')).resolves.toEqual({ data: [] });

    expect(leadsCalls).toBe(2);
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    for (const key of SEEDED_KEYS) {
      expect(queryClient.getQueryData(key)).toEqual({ owner: 'sessao-anterior' });
    }
  });

  it('login nunca herda cache residual de uma sessao anterior', async () => {
    const user = userEvent.setup();
    stubAuthenticatedBackend((url) => {
      if (url.includes('/v1/auth/refresh')) return jsonResponse(UNAUTHORIZED, 401);
      if (url.includes('/v1/auth/login')) {
        return jsonResponse({ access_token: 't2', expires_in: 900 });
      }
      return null;
    });
    const queryClient = newQueryClient();
    renderApp(queryClient);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    seedCache(queryClient);
    await user.click(screen.getByText('login B'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    expectCacheEmpty(queryClient);
  });

  it('as notificacoes do usuario anterior nao aparecem para o proximo usuario', async () => {
    const user = userEvent.setup();
    let current: 'A' | 'B' = 'A';
    const bGate = deferred<void>();
    const mePayload = {
      A: { id: '1', name: 'Ana', email: 'a@x.com', status: 'active' },
      B: { id: '2', name: 'Bia', email: 'b@x.com', status: 'active' },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/v1/auth/refresh')) return jsonResponse(UNAUTHORIZED, 401);
        if (url.includes('/v1/auth/login')) {
          const body = JSON.parse(String(init?.body)) as { email: string };
          current = body.email === 'a@x.com' ? 'A' : 'B';
          return jsonResponse({ access_token: `token-${current}`, expires_in: 900 });
        }
        if (url.includes('/v1/auth/logout')) return new Response(null, { status: 204 });
        if (url.includes('/v1/users/me')) return jsonResponse(mePayload[current]);

        // O usuario B responde devagar: e a janela em que dado em cache do A poderia vazar.
        if (url.includes('/v1/notifications')) {
          const who = current;
          if (who === 'B') await bGate.promise;
          if (url.includes('/unread-count')) return jsonResponse({ count: who === 'A' ? 3 : 1 });
          return jsonResponse({
            data: [
              {
                id: who === 'A' ? 'n-a' : 'n-b',
                type: 'lead.assigned',
                entity_type: 'lead',
                entity_id: 'l1',
                payload: { lead_name: who === 'A' ? 'Alfa Ltda' : 'Beta Ltda' },
                read_at: null,
                created_at: '2026-10-08T12:00:00.000Z',
              },
            ],
            next_cursor: null,
          });
        }
        return jsonResponse({}, 404);
      }),
    );

    const queryClient = newQueryClient();
    renderApp(queryClient, true);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    // Usuario A ve as proprias notificacoes (contador e lista).
    await user.click(screen.getByText('login A'));
    await waitFor(() => expect(screen.getByTestId('notification-badge')).toHaveTextContent('3'));
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(await screen.findByText(/Alfa Ltda/)).toBeInTheDocument();

    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.queryByText(/Alfa Ltda/)).not.toBeInTheDocument();

    // Usuario B entra; as respostas dele ainda nao chegaram: nada do A pode aparecer.
    await user.click(screen.getByText('login B'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(screen.queryByText(/Alfa Ltda/)).not.toBeInTheDocument();

    // Chegam os dados do B: so os dele.
    bGate.resolve();
    expect(await screen.findByText(/Beta Ltda/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('notification-badge')).toHaveTextContent('1'));
    expect(screen.queryByText(/Alfa Ltda/)).not.toBeInTheDocument();
  });
});
