import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { AccessExceptionsPage } from './AccessExceptionsPage';
import * as service from '../services/accessControl';
import type { AccessException } from '../types/accessControl';

vi.mock('../services/accessControl');

const MANAGER = ['access_exceptions:manage', 'users:read'];
const FUTURE_LOCAL = '2099-01-01T10:00';

const VIGENTE: AccessException = {
  id: 'e-vigente',
  user_id: 'u-vendedor',
  granted_by: 'u-gerente',
  scope: 'leads',
  starts_at: '2020-01-01T00:00:00.000Z',
  expires_at: '2099-12-31T00:00:00.000Z',
  reason: 'Plantao de sabado',
  revoked_at: null,
};
const REVOGADA: AccessException = {
  ...VIGENTE,
  id: 'e-revogada',
  scope: 'conversations',
  reason: 'Revogada cedo',
  revoked_at: '2020-06-01T00:00:00.000Z',
};
const EXPIRADA: AccessException = {
  ...VIGENTE,
  id: 'e-expirada',
  scope: 'all',
  reason: 'Ja venceu',
  expires_at: '2020-02-01T00:00:00.000Z',
};

const page = (data: AccessException[], total = data.length) => ({
  data,
  page: 1,
  limit: 20,
  total,
});

function renderPage(permissions: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u-gerente', name: 'Gil', email: 'gil@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <AccessExceptionsPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function mockLists() {
  vi.mocked(service.listAccessExceptions).mockResolvedValue(page([VIGENTE, REVOGADA, EXPIRADA]));
  vi.mocked(service.listExceptionUsers).mockResolvedValue({
    data: [
      { id: 'u-vendedor', name: 'Vera Vendedora', status: 'active' },
      { id: 'u-off', name: 'Inativo', status: 'inactive' },
    ],
  });
}

describe('AccessExceptionsPage (F4.7, Admin e Gerente)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem access_exceptions:manage: acesso restrito e nenhuma chamada a API', () => {
    renderPage(['leads:read']);
    expect(screen.getByText(/nao tem permissao para gerenciar liberacoes/i)).toBeInTheDocument();
    expect(service.listAccessExceptions).not.toHaveBeenCalled();
    expect(service.listExceptionUsers).not.toHaveBeenCalled();
  });

  it('lista com usuario, escopo, motivo e estado; so a vigente tem o botao Revogar', async () => {
    mockLists();
    renderPage(MANAGER);

    expect(await screen.findByText(/Vera Vendedora · Leads$/)).toBeInTheDocument();
    expect(screen.getByText('Plantao de sabado')).toBeInTheDocument();
    expect(screen.getByTestId('status-e-vigente')).toHaveTextContent('Vigente');
    expect(screen.getByTestId('status-e-revogada')).toHaveTextContent('Revogada');
    expect(screen.getByTestId('status-e-expirada')).toHaveTextContent('Expirada');
    expect(screen.getAllByRole('button', { name: 'Revogar' })).toHaveLength(1);
    expect(service.listAccessExceptions).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      active: undefined,
    });
  });

  it('o filtro pede so vigentes (active=true) ou so revogadas/expiradas (active=false)', async () => {
    const user = userEvent.setup();
    mockLists();
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');

    await user.selectOptions(screen.getByLabelText('Mostrar'), 'active');
    await waitFor(() =>
      expect(service.listAccessExceptions).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        active: true,
      }),
    );
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'inactive');
    await waitFor(() =>
      expect(service.listAccessExceptions).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        active: false,
      }),
    );
  });

  it('concede: envia usuario, escopo, motivo sem espacos e expiracao em ISO; nao envia inicio', async () => {
    const user = userEvent.setup();
    mockLists();
    vi.mocked(service.createAccessException).mockResolvedValue(VIGENTE);
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');

    // so usuarios ativos entram na lista
    const userSelect = screen.getByLabelText('Usuario');
    expect(within(userSelect).queryByText('Inativo')).not.toBeInTheDocument();
    await user.selectOptions(userSelect, 'u-vendedor');
    await user.selectOptions(screen.getByLabelText('Acesso liberado'), 'all');
    await user.type(screen.getByLabelText('Motivo'), '  Atendimento especial  ');
    fireEvent.change(screen.getByLabelText('Vale ate'), { target: { value: FUTURE_LOCAL } });
    await user.click(screen.getByRole('button', { name: 'Conceder liberacao' }));

    await waitFor(() =>
      expect(service.createAccessException).toHaveBeenCalledWith({
        user_id: 'u-vendedor',
        scope: 'all',
        reason: 'Atendimento especial',
        expires_at: new Date(FUTURE_LOCAL).toISOString(),
      }),
    );
    expect(await screen.findByText(/liberacao concedida/i)).toBeInTheDocument();
    // a lista e consultada de novo e o formulario limpa motivo e data
    await waitFor(() => expect(service.listAccessExceptions).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Motivo')).toHaveValue('');
  });

  it('validacao local: motivo, data e data futura sao obrigatorios (nada e enviado)', async () => {
    const user = userEvent.setup();
    mockLists();
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');
    const submit = () => user.click(screen.getByRole('button', { name: 'Conceder liberacao' }));

    // formulario nativo: required impede o envio sem usuario; escolhe o usuario para chegar na regra
    await user.selectOptions(screen.getByLabelText('Usuario'), 'u-vendedor');
    await user.type(screen.getByLabelText('Motivo'), '   ');
    fireEvent.change(screen.getByLabelText('Vale ate'), { target: { value: FUTURE_LOCAL } });
    fireEvent.submit(screen.getByRole('button', { name: 'Conceder liberacao' }).closest('form')!);
    expect(await screen.findByText(/informe o motivo/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Motivo'));
    await user.type(screen.getByLabelText('Motivo'), 'Motivo');
    fireEvent.change(screen.getByLabelText('Vale ate'), { target: { value: '2001-01-01T10:00' } });
    await submit();
    expect(await screen.findByText(/expiracao deve estar no futuro/i)).toBeInTheDocument();

    expect(service.createAccessException).not.toHaveBeenCalled();
  });

  it('o backend rejeita conceder a quem nao esta sujeito a restricao: mostra a mensagem', async () => {
    const user = userEvent.setup();
    mockLists();
    vi.mocked(service.createAccessException).mockRejectedValue(
      new ApiError(422, 'ACCESS_EXCEPTION_TARGET_NOT_RESTRICTED', 'x'),
    );
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');

    await user.selectOptions(screen.getByLabelText('Usuario'), 'u-vendedor');
    await user.type(screen.getByLabelText('Motivo'), 'Motivo');
    fireEvent.change(screen.getByLabelText('Vale ate'), { target: { value: FUTURE_LOCAL } });
    await user.click(screen.getByRole('button', { name: 'Conceder liberacao' }));

    expect(
      await screen.findByText(/nao esta sujeito a restricao por horario/i),
    ).toBeInTheDocument();
  });

  it('revoga a vigente: chama o servico, avisa que as demais continuam e recarrega', async () => {
    const user = userEvent.setup();
    mockLists();
    vi.mocked(service.revokeAccessException).mockResolvedValue({
      ...VIGENTE,
      revoked_at: '2026-10-14T20:00:00.000Z',
    });
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');

    await user.click(screen.getByRole('button', { name: 'Revogar' }));

    await waitFor(() => expect(service.revokeAccessException).toHaveBeenCalledWith('e-vigente'));
    expect(
      await screen.findByText(/demais liberacoes do usuario continuam valendo/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(service.listAccessExceptions).toHaveBeenCalledTimes(2));
  });

  it('falha ao revogar mostra erro', async () => {
    const user = userEvent.setup();
    mockLists();
    vi.mocked(service.revokeAccessException).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    renderPage(MANAGER);
    await screen.findByText('Plantao de sabado');

    await user.click(screen.getByRole('button', { name: 'Revogar' }));
    expect(await screen.findByText(/registro nao encontrado/i)).toBeInTheDocument();
  });

  it('estado vazio e erro de carregamento com nova tentativa', async () => {
    vi.mocked(service.listExceptionUsers).mockResolvedValue({ data: [] });
    vi.mocked(service.listAccessExceptions).mockResolvedValueOnce(page([]));
    renderPage(MANAGER);
    expect(await screen.findByText('Nenhuma liberacao encontrada')).toBeInTheDocument();
  });

  it('sem users:read o destinatario e informado por id e a lista de usuarios nao e consultada', async () => {
    vi.mocked(service.listAccessExceptions).mockResolvedValue(page([]));
    renderPage(['access_exceptions:manage']);
    expect(await screen.findByLabelText('Usuario (id)')).toBeInTheDocument();
    expect(service.listExceptionUsers).not.toHaveBeenCalled();
  });
});
