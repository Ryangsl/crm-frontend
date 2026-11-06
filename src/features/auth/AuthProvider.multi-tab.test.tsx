import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CHANNEL_NAME, AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

// D-091: a sessao e uma so para todas as abas; entrar ou sair numa aba e avisado as demais.

// BroadcastChannel minimo: entrega a mensagem para os OUTROS canais de mesmo nome, como o navegador.
class FakeChannel {
  static open: FakeChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(readonly name: string) {
    FakeChannel.open.push(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeChannel.open) {
      if (other !== this && other.name === this.name) {
        queueMicrotask(() => other.onmessage?.({ data } as MessageEvent));
      }
    }
  }
  close() {
    FakeChannel.open = FakeChannel.open.filter((channel) => channel !== this);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Probe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <button onClick={() => login('ana@x.com', 'secret').catch(() => {})}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function renderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['dado-da-sessao'], 'segredo');
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

// "Outra aba": um canal proprio, que escuta e fala no mesmo nome.
function otherTab() {
  const channel = new FakeChannel(AUTH_CHANNEL_NAME);
  const received: unknown[] = [];
  channel.onmessage = (event) => received.push(event.data);
  return { channel, received };
}

describe('AuthProvider com varias abas (D-091)', () => {
  let me = { id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' };
  const fetchMock = vi.fn();

  beforeEach(() => {
    FakeChannel.open = [];
    me = { id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' };
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh') || url.includes('/v1/auth/login')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/auth/logout')) return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes('/v1/users/me')) return Promise.resolve(jsonResponse(me));
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('BroadcastChannel', FakeChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const calls = (path: string) =>
    fetchMock.mock.calls.filter(([input]) => String(input).includes(path)).length;

  it('saida em outra aba encerra a sessao aqui, limpa o cache e nao chama a API', async () => {
    const queryClient = renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    const tab = otherTab();

    await act(async () => tab.channel.postMessage({ type: 'signed-out' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(queryClient.getQueryData(['dado-da-sessao'])).toBeUndefined();
    expect(calls('/v1/auth/logout')).toBe(0);
  });

  it('sair aqui avisa as outras abas', async () => {
    const user = userEvent.setup();
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    const tab = otherTab();

    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(tab.received).toEqual([{ type: 'signed-out' }]));
  });

  it('entrada em outra aba (outro usuario): descarta o cache e retoma a sessao atual', async () => {
    const queryClient = renderAuth();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('ana@x.com'));
    const refreshesBefore = calls('/v1/auth/refresh');
    me = { id: '2', name: 'Bia', email: 'bia@x.com', status: 'active' };
    queryClient.setQueryData(['dado-da-sessao'], 'segredo-da-ana');
    const tab = otherTab();

    await act(async () => tab.channel.postMessage({ type: 'signed-in' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('bia@x.com'));
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(queryClient.getQueryData(['dado-da-sessao'])).toBeUndefined();
    expect(calls('/v1/auth/refresh')).toBe(refreshesBefore + 1);
  });

  it('entrar aqui avisa as outras abas, sem nenhum token na mensagem', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, 401),
        );
      }
      if (url.includes('/v1/auth/login')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) return Promise.resolve(jsonResponse(me));
      return Promise.resolve(jsonResponse({}, 404));
    });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    const tab = otherTab();

    await user.click(screen.getByText('login'));

    await waitFor(() => expect(tab.received).toEqual([{ type: 'signed-in' }]));
  });
});
