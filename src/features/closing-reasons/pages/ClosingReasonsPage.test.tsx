import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import * as service from '../services';
import { reasonsOf } from '../testing';
import { ClosingReasonsPage } from './ClosingReasonsPage';

vi.mock('../services');

function renderPage(permissions = ['tenant_settings:update']) {
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
          <ClosingReasonsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(service.listClosingReasons).mockImplementation((kind) =>
    Promise.resolve(reasonsOf(kind)),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Motivos de perda e de desqualificação (D-099)', () => {
  it('mostra as duas listas separadas; "Outro" não tem ações', async () => {
    renderPage();
    const lost = await screen.findByRole('list', { name: 'Motivos de perda' });
    const disqualified = await screen.findByRole('list', { name: 'Motivos de desqualificação' });
    expect(within(lost).getByText('Preço')).toBeInTheDocument();
    expect(within(disqualified).getByText('Sem perfil')).toBeInTheDocument();
    expect(within(lost).queryByText('Sem perfil')).not.toBeInTheDocument();

    expect(within(lost).getByRole('button', { name: 'Renomear Preço' })).toBeInTheDocument();
    expect(within(lost).queryByRole('button', { name: 'Renomear Outro' })).not.toBeInTheDocument();
    expect(within(lost).queryByRole('button', { name: 'Excluir Outro' })).not.toBeInTheDocument();
    expect(within(lost).getByText('Exige justificativa')).toBeInTheDocument();
  });

  it('cria um motivo na lista certa e mostra o conflito de nome', async () => {
    vi.mocked(service.createClosingReason)
      .mockResolvedValueOnce({
        ...reasonsOf('lead_disqualified').data[0],
        id: 'n1',
        name: 'Fora da região',
      })
      .mockRejectedValueOnce(new ApiError(409, 'CLOSING_REASON_NAME_IN_USE', 'Já existe.'));
    renderPage();
    const input = await screen.findByLabelText('Novo motivo em motivos de desqualificação');

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('Informe um nome entre 2 e 80 caracteres.')).toBeInTheDocument();
    expect(service.createClosingReason).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '  Fora da região ' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() =>
      expect(service.createClosingReason).toHaveBeenCalledWith(
        'lead_disqualified',
        'Fora da região',
      ),
    );
    expect(await screen.findByText('Motivo criado.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Sem perfil' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('Já existe um motivo com esse nome.')).toBeInTheDocument();
  });

  it('renomeia e exclui', async () => {
    vi.mocked(service.renameClosingReason).mockResolvedValue({
      ...reasonsOf('opportunity_lost').data[0],
      name: 'Preço alto',
    });
    vi.mocked(service.deleteClosingReason).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Renomear Preço' }));
    fireEvent.change(screen.getByLabelText('Nome do motivo'), { target: { value: 'Preço alto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(service.renameClosingReason).toHaveBeenCalledWith('opportunity_lost-1', 'Preço alto'),
    );
    expect(await screen.findByText('Motivo renomeado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Sem perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(service.deleteClosingReason).toHaveBeenCalledWith('lead_disqualified-1'),
    );
  });

  it('quem não configura a empresa só consulta', async () => {
    renderPage([]);
    expect(await screen.findByText('Somente consulta')).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Motivos de perda' });
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renomear Preço' })).not.toBeInTheDocument();
  });

  it('erro ao carregar uma lista oferece tentar novamente', async () => {
    vi.mocked(service.listClosingReasons).mockRejectedValue(new Error('falhou'));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Não foi possível carregar os motivos')).toHaveLength(2),
    );
    expect(screen.getAllByRole('button', { name: 'Tentar novamente' })).toHaveLength(2);
  });
});
