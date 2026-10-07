import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as service from '@/features/notifications/services/notifications';
import { AppShell } from './AppShell';

vi.mock('@/features/notifications/services/notifications');

function renderShell(permissions: string[], authenticated = true) {
  vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 2 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: authenticated ? 'authenticated' : 'unauthenticated',
    user: authenticated
      ? { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions }
      : null,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<p>Conteudo</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AppShell — sino de notificacoes (F4.5)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('qualquer usuario autenticado ve o sino, mesmo sem nenhuma permissao (sidebar e header)', async () => {
    renderShell([]);
    // Duas instancias (sidebar desktop + header mobile); so uma e visivel por CSS.
    const bells = await screen.findAllByRole('button', { name: /notificacoes/i });
    expect(bells).toHaveLength(2);
    await waitFor(() => expect(service.getUnreadCount).toHaveBeenCalled());
  });

  it('mostra o contador de nao lidas vindo da API', async () => {
    renderShell(['leads:read']);
    const badges = await screen.findAllByTestId('notification-badge');
    for (const badge of badges) expect(badge).toHaveTextContent('2');
  });

  it('nao adiciona item na navegacao (nem no bottom nav mobile)', async () => {
    renderShell(['leads:read']);
    await screen.findAllByRole('button', { name: /notificacoes/i });
    for (const nav of screen.getAllByRole('navigation', { name: 'Principal' })) {
      expect(nav).not.toHaveTextContent(/notifica/i);
    }
    expect(screen.queryByRole('link', { name: /notifica/i })).not.toBeInTheDocument();
  });

  it('sem usuario autenticado nao ha sino e nenhuma consulta e feita', () => {
    renderShell([], false);
    expect(screen.queryByRole('button', { name: /notificacoes/i })).not.toBeInTheDocument();
    expect(service.getUnreadCount).not.toHaveBeenCalled();
  });
});
