import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as service from '@/features/availability/services/availability';
import { AppShell } from './AppShell';

vi.mock('@/features/availability/services/availability');

function renderShell(permissions: string[], enabled: boolean) {
  vi.mocked(service.getMyAvailability).mockResolvedValue({
    enabled,
    status: 'available',
    since: null,
  });
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

describe('AppShell — disponibilidade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem permissoes de disponibilidade: sem seletor, sem item de menu e sem chamada a API', () => {
    renderShell(['leads:read'], true);
    expect(screen.queryByLabelText('Disponibilidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Equipe')).not.toBeInTheDocument();
    expect(service.getMyAvailability).not.toHaveBeenCalled();
  });

  it('vendedor (availability:update) com a flag ligada: ve o seletor, mas nao o painel da equipe', async () => {
    renderShell(['availability:update'], true);
    expect((await screen.findAllByLabelText('Disponibilidade')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Equipe')).not.toBeInTheDocument();
  });

  it('gerente (read + manage) com a flag ligada: ve o seletor e o item "Equipe"', async () => {
    renderShell(['availability:read', 'availability:manage'], true);
    expect((await screen.findAllByLabelText('Disponibilidade')).length).toBeGreaterThan(0);
    const links = await screen.findAllByRole('link', { name: /equipe/i });
    for (const link of links) expect(link).toHaveAttribute('href', '/team/availability');
  });

  it('supervisor (so read): ve o item "Equipe" mas nao o seletor', async () => {
    renderShell(['availability:read'], true);
    expect((await screen.findAllByRole('link', { name: /equipe/i })).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Disponibilidade')).not.toBeInTheDocument();
  });

  it('flag desabilitada: nem seletor nem item "Equipe", mesmo com todas as permissoes', async () => {
    renderShell(['availability:read', 'availability:update', 'availability:manage'], false);
    await waitFor(() => expect(service.getMyAvailability).toHaveBeenCalled());
    expect(screen.queryByLabelText('Disponibilidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Equipe')).not.toBeInTheDocument();
  });
});
