import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as api from '@/services/api';
import { ApiError } from '@/services/api';
import { AccountPage } from './AccountPage';

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  apiPost: vi.fn(),
  setAccessToken: vi.fn(),
}));

function renderPage() {
  const auth: AuthState = {
    status: 'authenticated',
    user: {
      id: 'u1',
      name: 'Ana',
      email: 'ana@x.com',
      status: 'active',
      permissions: [],
      roles: [],
    },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: () => false,
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function fill(current: string, next: string, confirm = next) {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Minha conta — troca da propria senha (D-064)', () => {
  it('troca a senha e guarda o access token novo (as outras sessoes caem no backend)', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({ access_token: 'novo', expires_in: 900 });
    renderPage();

    fill('Atual123!', 'NovaSenha123');

    await waitFor(() =>
      expect(api.apiPost).toHaveBeenCalledWith('/v1/users/me/password', {
        current_password: 'Atual123!',
        new_password: 'NovaSenha123',
      }),
    );
    expect(await screen.findByText(/outros dispositivos foram encerradas/)).toBeInTheDocument();
    expect(api.setAccessToken).toHaveBeenCalledWith('novo');
  });

  it('confere tamanho e confirmacao antes de enviar', () => {
    renderPage();
    fill('Atual123!', 'curta');
    expect(screen.getByText(/de 8 a 72 caracteres/)).toBeInTheDocument();
    fill('Atual123!', 'NovaSenha123', 'Diferente123');
    expect(screen.getByText(/confirmação não é igual/)).toBeInTheDocument();
    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it('explica senha atual errada', async () => {
    vi.mocked(api.apiPost).mockRejectedValue(new ApiError(422, 'INVALID_CURRENT_PASSWORD', 'x'));
    renderPage();
    fill('Errada', 'NovaSenha123');
    expect(await screen.findByText('A senha atual não confere.')).toBeInTheDocument();
    expect(api.setAccessToken).not.toHaveBeenCalled();
  });
});
