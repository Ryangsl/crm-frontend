import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/services/api';
import { ApiError } from '@/services/api';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  apiPost: vi.fn(),
}));

function open(hash: string) {
  window.history.replaceState(null, '', `/redefinir-senha${hash}`);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('Redefinir senha pelo link (D-064)', () => {
  it('le o token do fragmento, apaga-o da barra de endereço e define a senha', async () => {
    vi.mocked(api.apiPost).mockImplementation(async (path: string) =>
      path.endsWith('/check') ? { expires_at: '2026-11-07T12:00:00.000Z' } : undefined,
    );
    open('#token=abc.segredo');

    expect(window.location.hash).toBe('');
    fireEvent.change(await screen.findByLabelText('Nova senha'), {
      target: { value: 'SenhaNova123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'SenhaNova123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Definir senha' }));

    expect(await screen.findByText('Senha definida')).toBeInTheDocument();
    expect(api.apiPost).toHaveBeenCalledWith('/v1/auth/password-reset/check', {
      token: 'abc.segredo',
    });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/auth/password-reset', {
      token: 'abc.segredo',
      new_password: 'SenhaNova123',
    });
    expect(screen.getByRole('link', { name: 'Entrar no CRM' })).toHaveAttribute('href', '/login');
  });

  it('link vencido ou já usado: explica e não mostra o formulário', async () => {
    vi.mocked(api.apiPost).mockRejectedValue(
      new ApiError(400, 'INVALID_PASSWORD_RESET_TOKEN', 'x'),
    );
    open('#token=velho.token');

    expect(await screen.findByText(/Este link não vale mais/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('sem token no endereço: não chama a API', async () => {
    open('');
    expect(screen.getByText(/exatamente como recebeu/)).toBeInTheDocument();
    await waitFor(() => expect(api.apiPost).not.toHaveBeenCalled());
  });
});
