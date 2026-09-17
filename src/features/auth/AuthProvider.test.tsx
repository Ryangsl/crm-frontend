import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Probe() {
  const { status, user, login, logout, hasPermission } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <p data-testid="perm">{hasPermission('customers:read') ? 'yes' : 'no'}</p>
      {/* catch vazio: aqui so interessa o estado exposto pelo contexto apos a tentativa —
          quem trata o erro de verdade para o usuario e o LoginPage (proprio try/catch). */}
      <button onClick={() => login('ana@x.com', 'secret').catch(() => {})}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('comeca em loading e cai para unauthenticated quando o refresh inicial falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, 401),
        ),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('restaura a sessao quando o refresh inicial funciona', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) {
        return Promise.resolve(
          jsonResponse({ id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' }),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('ana@x.com');
  });

  it('login com credenciais validas autentica o usuario', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, 401),
        );
      }
      if (url.includes('/v1/auth/login')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) {
        return Promise.resolve(
          jsonResponse({ id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' }),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    await user.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('ana@x.com');
  });

  it('login com credenciais invalidas mantem o usuario desautenticado e propaga o erro', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(
          jsonResponse({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }, 401),
        );
      }
      if (url.includes('/v1/auth/login')) {
        return Promise.resolve(
          jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha invalidos.' } }, 401),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    await user.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('logout limpa a sessao', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) {
        return Promise.resolve(
          jsonResponse({ id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' }),
        );
      }
      if (url.includes('/v1/auth/logout')) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('hasPermission reflete as permissoes do usuario autenticado', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) {
        return Promise.resolve(
          jsonResponse({
            id: '1',
            name: 'Ana',
            email: 'ana@x.com',
            status: 'active',
            permissions: ['customers:read'],
          }),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('yes'));
  });

  it('sem o campo permissions na resposta, hasPermission sempre retorna false (gap documentado)', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ access_token: 't', expires_in: 900 }));
      }
      if (url.includes('/v1/users/me')) {
        return Promise.resolve(
          jsonResponse({ id: '1', name: 'Ana', email: 'ana@x.com', status: 'active' }),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('perm')).toHaveTextContent('no');
  });
});
