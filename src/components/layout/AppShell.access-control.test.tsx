import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as accessService from '@/features/access-control/services/accessControl';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as notificationsService from '@/features/notifications/services/notifications';
import { AppShell } from './AppShell';

vi.mock('@/features/notifications/services/notifications');
vi.mock('@/features/access-control/services/accessControl');

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

describe('AppShell — F4.7 (liberacoes e banner de horario)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('o item "Liberacoes" so aparece com access_exceptions:manage e aponta para a tela', () => {
    vi.mocked(accessService.getAccessStatus).mockResolvedValue({
      restriction_enabled: false,
      applies_to_me: false,
      within_business_hours: null,
      access: { leads: true, conversations: true },
    });
    const { unmount } = renderShell(['leads:read']);
    expect(screen.queryByText('Liberacoes')).not.toBeInTheDocument();
    unmount();

    renderShell(['access_exceptions:manage']);
    const links = screen.getAllByRole('link', { name: /liberacoes/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/settings/access-exceptions');
  });

  it('o banner de fora do horario aparece acima do conteudo para o usuario restringido', async () => {
    vi.mocked(accessService.getAccessStatus).mockResolvedValue({
      restriction_enabled: true,
      applies_to_me: true,
      within_business_hours: false,
      access: { leads: false, conversations: false },
    });
    renderShell(['leads:read']);
    const banner = await screen.findByTestId('access-status-banner');
    expect(banner).toHaveTextContent('Leads e Conversas');
    expect(screen.getByText('Conteudo')).toBeInTheDocument();
  });

  it('sem restricao em vigor nao ha banner', async () => {
    vi.mocked(accessService.getAccessStatus).mockResolvedValue({
      restriction_enabled: true,
      applies_to_me: false,
      within_business_hours: false,
      access: { leads: true, conversations: true },
    });
    renderShell(['leads:read']);
    await waitFor(() => expect(accessService.getAccessStatus).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId('access-status-banner')).not.toBeInTheDocument();
  });
});
