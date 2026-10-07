import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { AppShell } from './AppShell';

function renderShell(permissions: string[]) {
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<p>Conteudo</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('AppShell — item de conversas (F4.6)', () => {
  it('sem conversations:read o item nao aparece (sidebar e bottom nav)', () => {
    renderShell(['leads:read']);
    expect(screen.queryByText('Conversas')).not.toBeInTheDocument();
    expect(screen.getAllByText('Leads').length).toBeGreaterThan(0);
  });

  it('com conversations:read o item aparece e aponta para /conversations', () => {
    renderShell(['conversations:read']);
    const links = screen.getAllByRole('link', { name: /conversas/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/conversations');
  });
});
