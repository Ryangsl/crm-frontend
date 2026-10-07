import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

describe('AppShell — item de configuracoes', () => {
  it('sem tenant_settings:read o item de configuracoes nao aparece (sidebar e bottom nav)', () => {
    renderShell(['leads:read']);
    expect(screen.queryByText('Config.')).not.toBeInTheDocument();
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0); // demais itens seguem
  });

  it('com tenant_settings:read o item aparece e aponta para o horario de funcionamento', () => {
    renderShell(['tenant_settings:read']);
    const links = screen.getAllByRole('link', { name: /config\./i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/settings/business-hours');
  });
});
