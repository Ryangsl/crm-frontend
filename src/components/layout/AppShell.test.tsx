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

function renderShell(permissions: string[], roles: string[] = []) {
  vi.mocked(notificationsService.getUnreadCount).mockResolvedValue({ count: 0 });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions, roles },
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
  it('aparece na Administracao do Admin e não entra na barra inferior, que já está cheia', () => {
    renderShell([], ['admin']);
    const sidebar = screen.getByRole('navigation', { name: 'Principal' });
    const bottom = screen.getByRole('navigation', { name: 'Atalhos' });
    expect(within(sidebar).getByRole('link', { name: /plano/i })).toHaveAttribute('href', '/plan');
    expect(within(bottom).queryByRole('link', { name: /plano/i })).not.toBeInTheDocument();
  });

  it('a barra inferior só tem o que cabe; o resto fica no menu Mais', () => {
    renderShell(['tenant_settings:read', 'conversations:read'], ['admin']);
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

describe('AppShell — item de configurações', () => {
  it('sem tenant_settings:read o item de configurações não aparece (sidebar e bottom nav)', () => {
    renderShell(['leads:read']);
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0); // demais itens seguem
  });

  it('com tenant_settings:read o item aparece e aponta para a central de configurações', () => {
    renderShell(['tenant_settings:read'], ['admin']);
    const links = screen.getAllByRole('link', { name: /configurações/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/settings');
  });
});

describe('AppShell — Administracao só para o Admin', () => {
  it('quem não e Admin não ve a secao Administracao, mesmo com permissões de leitura', () => {
    renderShell(['tenant_settings:read', 'users:read', 'plan:read'], ['diretor']);
    const sidebar = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(sidebar).queryByText('Administração')).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: /configurações/i })).not.toBeInTheDocument();
  });

  it('o Gerente continua com Liberações, fora da Administracao (D-082)', () => {
    renderShell(['access_exceptions:manage', 'leads:read'], ['gerente']);
    const sidebar = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(sidebar).queryByText('Administração')).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /liberações/i })).toHaveAttribute(
      'href',
      '/settings/access-exceptions',
    );
  });

  it('o Admin ve a Administracao completa', () => {
    renderShell(['tenant_settings:read', 'users:read', 'access_exceptions:manage'], ['admin']);
    const sidebar = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(sidebar).getByText('Administração')).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getAllByRole('link', { name: /liberações/i })).toHaveLength(1);
  });
});
