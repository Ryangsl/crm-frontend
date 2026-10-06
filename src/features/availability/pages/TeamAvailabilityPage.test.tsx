import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { TeamAvailabilityPage } from './TeamAvailabilityPage';
import * as service from '../services/availability';
import type { AvailabilityListResponse, MyAvailability } from '../types/availability';

vi.mock('../services/availability');

const ME_ON: MyAvailability = { enabled: true, status: 'unavailable', since: null };

const LIST: AvailabilityListResponse = {
  data: [
    { user_id: 'u1', name: 'Gerente Gil', status: 'available', since: '2026-10-05T12:00:00Z' },
    { user_id: 'u2', name: 'Vendedor Vera', status: 'break', since: '2026-10-05T13:00:00Z' },
    { user_id: 'u3', name: 'Backoffice Beto', status: 'training', since: '2026-10-05T14:00:00Z' },
    { user_id: 'u4', name: 'Operador Otto', status: 'unavailable', since: null },
  ],
  page: 1,
  limit: 20,
  total: 4,
};

function renderPage(permissions: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    // u1 = o proprio usuario logado.
    user: { id: 'u1', name: 'Gerente Gil', email: 'g@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <TeamAvailabilityPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

const MANAGER = ['availability:read', 'availability:manage'];

describe('TeamAvailabilityPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem availability:read: acesso restrito e nenhuma chamada a API', () => {
    renderPage(['availability:update']);
    expect(screen.getByText(/nao tem permissao para acessar/i)).toBeInTheDocument();
    expect(service.getMyAvailability).not.toHaveBeenCalled();
    expect(service.listAvailability).not.toHaveBeenCalled();
  });

  it('mecanismo desabilitado: mostra aviso e nao lista a equipe', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue({ ...ME_ON, enabled: false });
    renderPage(MANAGER);

    expect(await screen.findByText(/nao esta habilitada/i)).toBeInTheDocument();
    expect(service.listAvailability).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Filtrar por estado')).not.toBeInTheDocument();
  });

  it('lista usuarios com estado e desde quando; sem registro aparece como Indisponivel', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    renderPage(['availability:read']);

    expect(await screen.findByText('Vendedor Vera')).toBeInTheDocument();
    expect(screen.getByTestId('status-u2')).toHaveTextContent('Pausa');
    expect(screen.getByTestId('status-u3')).toHaveTextContent('Treinamento');
    expect(screen.getByTestId('status-u4')).toHaveTextContent('Indisponivel');
    expect(screen.getByText(/desde sem registro/i)).toBeInTheDocument();
  });

  it('so leitura (supervisor/diretor): nenhuma acao de escrita', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    renderPage(['availability:read']);

    await screen.findByText('Vendedor Vera');
    expect(screen.queryByRole('button', { name: /treinamento/i })).not.toBeInTheDocument();
  });

  it('manage: oferece Treinamento so para terceiros (nunca para o proprio usuario) e so a acao correta por estado', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    renderPage(MANAGER);

    await screen.findByText('Vendedor Vera');
    expect(screen.queryByRole('button', { name: /gerente gil/i })).not.toBeInTheDocument(); // proprio
    expect(
      screen.getByRole('button', { name: 'Colocar Vendedor Vera em Treinamento' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Colocar Operador Otto em Treinamento' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retirar Backoffice Beto do Treinamento' }),
    ).toBeInTheDocument();
    // Nao ha controle para alterar Disponivel/Pausa/Almoco de terceiros.
    expect(
      screen.queryByRole('button', { name: /disponivel|pausa|almoco/i }),
    ).not.toBeInTheDocument();
  });

  it('colocar e retirar de Treinamento chamam a via de terceiros com o estado certo e recarregam', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    vi.mocked(service.setUserAvailability).mockResolvedValue({ ...ME_ON });
    const user = userEvent.setup();
    renderPage(MANAGER);

    await user.click(
      await screen.findByRole('button', { name: 'Colocar Vendedor Vera em Treinamento' }),
    );
    await waitFor(() => expect(service.setUserAvailability).toHaveBeenCalledWith('u2', 'training'));

    await user.click(
      screen.getByRole('button', { name: 'Retirar Backoffice Beto do Treinamento' }),
    );
    await waitFor(() =>
      expect(service.setUserAvailability).toHaveBeenCalledWith('u3', 'unavailable'),
    );
    await waitFor(() => expect(service.listAvailability).toHaveBeenCalledTimes(3)); // inicial + 2 recargas
  });

  it('erro ao alterar e exibido (403, desabilitado, inativo)', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    vi.mocked(service.setUserAvailability)
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'x'))
      .mockRejectedValueOnce(new ApiError(409, 'AVAILABILITY_USER_INACTIVE', 'x'));
    const user = userEvent.setup();
    renderPage(MANAGER);

    await user.click(
      await screen.findByRole('button', { name: 'Colocar Vendedor Vera em Treinamento' }),
    );
    expect(await screen.findByText(/nao tem permissao para esta acao/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Colocar Operador Otto em Treinamento' }));
    expect(await screen.findByText(/usuario esta inativo/i)).toBeInTheDocument();
  });

  it('filtro por estado envia o status e volta para a primeira pagina', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue(LIST);
    const user = userEvent.setup();
    renderPage(MANAGER);

    await user.selectOptions(await screen.findByLabelText('Filtrar por estado'), 'training');
    await waitFor(() =>
      expect(service.listAvailability).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: 'training',
      }),
    );
  });

  it('paginacao: mostra pagina atual e navega', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability).mockResolvedValue({ ...LIST, total: 45 });
    const user = userEvent.setup();
    renderPage(MANAGER);

    expect(await screen.findByText('Pagina 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Proxima' }));
    await waitFor(() =>
      expect(service.listAvailability).toHaveBeenLastCalledWith({
        page: 2,
        limit: 20,
        status: undefined,
      }),
    );
  });

  it('estado vazio e erro de carregamento com nova tentativa', async () => {
    vi.mocked(service.getMyAvailability).mockResolvedValue(ME_ON);
    vi.mocked(service.listAvailability)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'))
      .mockResolvedValueOnce({ data: [], page: 1, limit: 20, total: 0 });
    const user = userEvent.setup();
    renderPage(MANAGER);

    expect(await screen.findByText(/nao foi possivel carregar a equipe/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum usuario encontrado')).toBeInTheDocument();
  });
});
