import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ProtectedRoute } from './ProtectedRoute';

function renderWithAuth(status: AuthState['status']) {
  const value: AuthState = {
    status,
    user:
      status === 'authenticated'
        ? { id: '1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions: [] }
        : null,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: vi.fn().mockReturnValue(false),
  };

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Conteudo protegido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('mostra estado de carregamento enquanto a sessao e restaurada', () => {
    renderWithAuth('loading');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Conteudo protegido')).not.toBeInTheDocument();
  });

  it('redireciona para o login quando nao autenticado', () => {
    renderWithAuth('unauthenticated');
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('renderiza a rota protegida quando autenticado', () => {
    renderWithAuth('authenticated');
    expect(screen.getByText('Conteudo protegido')).toBeInTheDocument();
  });
});
