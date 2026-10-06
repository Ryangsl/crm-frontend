import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { AvailabilitySelector } from './AvailabilitySelector';
import * as service from '../services/availability';
import type { MyAvailability } from '../types/availability';

vi.mock('../services/availability');

const ME_ON: MyAvailability = { enabled: true, status: 'available', since: '2026-10-05T12:00:00Z' };

function renderSelector(permissions: string[]) {
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
        <AvailabilitySelector />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AvailabilitySelector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem availability:update nem availability:manage: nao renderiza e nem consulta a API', () => {
    renderSelector(['availability:read', 'leads:read']);
    expect(screen.queryByLabelText('Disponibilidade')).not.toBeInTheDocument();
    expect(service.getMyAvailability).not.toHaveBeenCalled();
  });

  it('mecanismo desabilitado: o seletor nao e exibido', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue({ ...ME_ON, enabled: false });
    renderSelector(['availability:update']);
    await waitFor(() => expect(service.getMyAvailability).toHaveBeenCalled());
    expect(screen.queryByLabelText('Disponibilidade')).not.toBeInTheDocument();
  });

  it('habilitado: mostra o estado atual e so os 4 estados que o proprio usuario pode escolher', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    renderSelector(['availability:update']);

    const select = await screen.findByLabelText('Disponibilidade');
    expect(select).toHaveValue('available');
    const labels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(labels).toEqual(['Disponivel', 'Indisponivel', 'Pausa', 'Almoco']); // sem Treinamento
    expect(select).toBeEnabled();
  });

  it('quem tem so availability:manage (Admin/Gerente) tambem altera o proprio estado', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue({ ...ME_ON, status: 'unavailable' });
    renderSelector(['availability:manage']);
    expect(await screen.findByLabelText('Disponibilidade')).toHaveValue('unavailable');
  });

  it('trocar o estado chama a API e reflete o valor devolvido', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.setMyAvailability).mockResolvedValue({ ...ME_ON, status: 'break' });
    const user = userEvent.setup();
    renderSelector(['availability:update']);

    await user.selectOptions(await screen.findByLabelText('Disponibilidade'), 'break');

    await waitFor(() => expect(service.setMyAvailability).toHaveBeenCalledWith('break'));
    await waitFor(() => expect(screen.getByLabelText('Disponibilidade')).toHaveValue('break'));
  });

  it('em Treinamento: seletor travado, somente leitura, com aviso', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue({ ...ME_ON, status: 'training' });
    renderSelector(['availability:update']);

    const select = await screen.findByLabelText('Disponibilidade');
    expect(select).toBeDisabled();
    expect(select).toHaveValue('training');
    expect(screen.getByText(/definido pelo gestor/i)).toBeInTheDocument();
  });

  it('erro AVAILABILITY_TRAINING_LOCKED mostra a mensagem e recarrega o estado', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.setMyAvailability).mockRejectedValue(
      new ApiError(403, 'AVAILABILITY_TRAINING_LOCKED', 'x'),
    );
    const user = userEvent.setup();
    renderSelector(['availability:update']);

    await user.selectOptions(await screen.findByLabelText('Disponibilidade'), 'lunch');

    expect(await screen.findByRole('alert')).toHaveTextContent(/enquanto estiver em Treinamento/i);
    await waitFor(() => expect(service.getMyAvailability).toHaveBeenCalledTimes(2));
  });

  it('erro AVAILABILITY_DISABLED mostra mensagem propria; erro generico tambem', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.setMyAvailability)
      .mockRejectedValueOnce(new ApiError(409, 'AVAILABILITY_DISABLED', 'x'))
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'));
    const user = userEvent.setup();
    renderSelector(['availability:update']);

    const select = await screen.findByLabelText('Disponibilidade');
    await user.selectOptions(select, 'break');
    expect(await screen.findByRole('alert')).toHaveTextContent(/foi desabilitada/i);
    await user.selectOptions(screen.getByLabelText('Disponibilidade'), 'lunch');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/nao foi possivel alterar/i),
    );
  });
});
