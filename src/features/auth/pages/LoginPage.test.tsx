import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { AuthContext } from '../auth-context';
import type { AuthState } from '../auth-context';
import * as authService from '../services/auth';
import { LoginPage } from './LoginPage';

vi.mock('../services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/auth')>()),
  fetchTenantContext: vi.fn(),
}));

function renderLogin(login = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth: AuthState = {
    status: 'unauthenticated',
    user: null,
    login,
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: () => false,
  };
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Login pelo endereco da empresa (D-088)', () => {
  it('mostra a empresa do endereco aberto', async () => {
    vi.mocked(authService.fetchTenantContext).mockResolvedValue({ tenant_name: 'Empresa A' });
    renderLogin();

    expect(await screen.findByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('endereco que nao corresponde a nenhuma empresa nao mostra o formulario', async () => {
    vi.mocked(authService.fetchTenantContext).mockResolvedValue(null);
    renderLogin();

    expect(await screen.findByText('Endereço não reconhecido')).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  it('falha de rede na consulta da empresa nao bloqueia o login', async () => {
    vi.mocked(authService.fetchTenantContext).mockRejectedValue(new Error('rede'));
    renderLogin();

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
  });

  it('explica a recusa do login por endereco desconhecido', async () => {
    vi.mocked(authService.fetchTenantContext).mockRejectedValue(new Error('rede'));
    const login = vi
      .fn()
      .mockRejectedValue(new ApiError(404, 'TENANT_DOMAIN_NOT_FOUND', 'Endereco desconhecido'));
    renderLogin(login);

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText(/não corresponde a nenhuma empresa/)).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('a@b.com', 'x');
  });
});
