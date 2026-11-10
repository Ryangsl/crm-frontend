import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import * as service from '../services/availability';
import { AvailabilitySettingsPage } from './AvailabilitySettingsPage';

vi.mock('../services/availability');

const ADMIN = ['tenant_settings:read', 'tenant_settings:update'];

function renderPage(permissions: string[]) {
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions, roles: [] },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key) => permissions.includes(key),
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <AvailabilitySettingsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Disponibilidade da equipe (configuração, D-071/D-077)', () => {
  it('Admin liga o mecanismo e vê o estado novo', async () => {
    vi.mocked(service.getAvailabilitySetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setAvailabilitySetting).mockResolvedValue({ enabled: true });
    renderPage(ADMIN);

    expect(await screen.findByTestId('availability-setting-state')).toHaveTextContent(
      'Disponibilidade: desligada',
    );
    expect(screen.getByText(/começa como Indisponível/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ligar disponibilidade' }));

    await waitFor(() => expect(service.setAvailabilitySetting).toHaveBeenCalledWith(true));
    expect(await screen.findByText('Disponibilidade ligada.')).toBeInTheDocument();
    expect(screen.getByTestId('availability-setting-state')).toHaveTextContent(
      'Disponibilidade: ligada',
    );
    expect(screen.getByRole('link', { name: 'Ver a equipe' })).toHaveAttribute(
      'href',
      '/team/availability',
    );
  });

  it('Admin desliga o mecanismo', async () => {
    vi.mocked(service.getAvailabilitySetting).mockResolvedValue({ enabled: true });
    vi.mocked(service.setAvailabilitySetting).mockResolvedValue({ enabled: false });
    renderPage(ADMIN);

    fireEvent.click(await screen.findByRole('button', { name: 'Desligar disponibilidade' }));
    await waitFor(() => expect(service.setAvailabilitySetting).toHaveBeenCalledWith(false));
    expect(await screen.findByText('Disponibilidade desligada.')).toBeInTheDocument();
  });

  it('a recusa do backend aparece e o estado não muda', async () => {
    vi.mocked(service.getAvailabilitySetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setAvailabilitySetting).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Forbidden'),
    );
    renderPage(ADMIN);

    fireEvent.click(await screen.findByRole('button', { name: 'Ligar disponibilidade' }));
    expect(
      await screen.findByText('Somente o Admin pode ligar ou desligar a disponibilidade.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('availability-setting-state')).toHaveTextContent('desligada');
  });

  it('só leitura: vê o estado sem o botão', async () => {
    vi.mocked(service.getAvailabilitySetting).mockResolvedValue({ enabled: true });
    renderPage(['tenant_settings:read']);

    expect(await screen.findByTestId('availability-setting-state')).toHaveTextContent('ligada');
    expect(screen.queryByRole('button', { name: /disponibilidade/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Somente o Admin pode ligar/)).toBeInTheDocument();
  });

  it('sem tenant_settings:read não consulta', () => {
    renderPage([]);
    expect(screen.getByText(/não tem permissão para ver as configurações/)).toBeInTheDocument();
    expect(service.getAvailabilitySetting).not.toHaveBeenCalled();
  });

  it('erro ao carregar oferece tentar novamente', async () => {
    vi.mocked(service.getAvailabilitySetting).mockRejectedValueOnce(new Error('rede'));
    renderPage(ADMIN);

    expect(await screen.findByText('Não foi possível carregar a configuração')).toBeInTheDocument();
    vi.mocked(service.getAvailabilitySetting).mockResolvedValue({ enabled: false });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTestId('availability-setting-state')).toHaveTextContent('desligada');
  });
});
