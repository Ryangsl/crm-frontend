import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as notificationsService from '@/features/notifications/services/notifications';
import { AppShell } from './AppShell';

// O AppShell passou a conter o sino de notificacoes (F4.5), que consulta a API: o harness
// precisa de QueryClient e do servico mockado. As assercoes deste arquivo nao mudaram.
vi.mock('@/features/notifications/services/notifications');

function renderShell(permissions: string[]) {
  vi.mocked(notificationsService.getUnreadCount).mockResolvedValue({ count: 0 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions },
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

describe('AppShell — item de plano (D-085)', () => {
  it('aparece na sidebar para todo usuario e nao entra na barra inferior, que ja esta cheia', () => {
    renderShell([]);
    const sidebar = screen.getByRole('navigation', { name: 'Principal' });
    const bottom = screen.getByRole('navigation', { name: 'Atalhos' });
    expect(within(sidebar).getByRole('link', { name: /plano/i })).toHaveAttribute('href', '/plan');
    expect(within(bottom).queryByRole('link', { name: /plano/i })).not.toBeInTheDocument();
  });

  it('a barra inferior so tem o que cabe; o resto fica no menu Mais', () => {
    renderShell(['tenant_settings:read', 'conversations:read']);
    const bottom = screen.getByRole('navigation', { name: 'Atalhos' });
    expect(within(bottom).getAllByRole('link')).toHaveLength(4);

    fireEvent.click(within(bottom).getByRole('button', { name: 'Mais' }));

    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(menu).getByRole('link', { name: 'Conversas' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('mostra a marca institucional do produto', () => {
    renderShell([]);
    expect(screen.getAllByText('CRM Universal').length).toBeGreaterThan(0);
    expect(screen.queryByText(/call center/i)).not.toBeInTheDocument();
  });
});

describe('AppShell — item de configuracoes', () => {
  it('sem tenant_settings:read o item de configuracoes nao aparece (sidebar e bottom nav)', () => {
    renderShell(['leads:read']);
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0); // demais itens seguem
  });

  it('com tenant_settings:read o item aparece e aponta para a central de configuracoes', () => {
    renderShell(['tenant_settings:read']);
    const links = screen.getAllByRole('link', { name: /configurações/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/settings');
  });
});
