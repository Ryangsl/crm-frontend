import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { BusinessHoursPage } from './BusinessHoursPage';
import * as service from '../services/businessHours';
import type { BusinessHours, BusinessHoursResponse } from '../types/businessHours';

vi.mock('../services/businessHours');

const HOURS: BusinessHours = {
  schema_version: 1,
  timezone: 'America/Sao_Paulo',
  weekly: [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }],
};
const CONFIGURED: BusinessHoursResponse = {
  configured: true,
  business_hours: HOURS,
  updated_at: '2026-10-05T12:00:00Z',
};
const EMPTY: BusinessHoursResponse = { configured: false, business_hours: null, updated_at: null };

function renderPage(permissions: string[]) {
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
        <BusinessHoursPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

const ADMIN = ['tenant_settings:read', 'tenant_settings:update'];

describe('BusinessHoursPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sem tenant_settings:read: mostra acesso restrito e nem consulta a API', () => {
    renderPage(['leads:read']);
    expect(screen.getByText(/nao tem permissao para acessar/i)).toBeInTheDocument();
    expect(service.getBusinessHours).not.toHaveBeenCalled();
  });

  it('mostra o carregamento e depois os valores persistidos', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(ADMIN);

    expect(screen.getByText(/carregando configuracao/i)).toBeInTheDocument();
    expect(await screen.findByLabelText('Inicio (janela 1)')).toHaveValue('09:00');
    expect(screen.getByLabelText('Fim (janela 1)')).toHaveValue('17:00');
    expect(screen.getByLabelText('Fuso horario')).toHaveValue('America/Sao_Paulo');
    expect(screen.getByRole('checkbox', { name: 'Seg' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sab' })).not.toBeChecked();
    expect(screen.queryByText(/nenhum horario configurado/i)).not.toBeInTheDocument();
  });

  it('avisa que o horario ainda nao tem efeito operacional', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(ADMIN);
    expect(await screen.findByText(/apenas fica registrado/i)).toBeInTheDocument();
  });

  it('tenant sem configuracao: mostra a sugestao e nada e gravado sem salvar', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(EMPTY);
    renderPage(ADMIN);

    expect(await screen.findByText(/nenhum horario configurado/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Inicio (janela 1)')).toHaveValue('08:00');
    expect(service.saveBusinessHours).not.toHaveBeenCalled();
  });

  it('salva alteracoes enviando o formato v1 e mostra confirmacao', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    vi.mocked(service.saveBusinessHours).mockResolvedValue({
      ...CONFIGURED,
      business_hours: {
        ...HOURS,
        weekly: [{ days: [1, 2, 3, 4, 5, 6], start: '10:00', end: '17:00' }],
      },
      updated_at: '2026-10-05T13:00:00Z',
    });
    const user = userEvent.setup();
    renderPage(ADMIN);

    fireEvent.change(await screen.findByLabelText('Inicio (janela 1)'), {
      target: { value: '10:00' },
    });
    await user.click(screen.getByRole('checkbox', { name: 'Sab' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(service.saveBusinessHours).toHaveBeenCalledWith({
        schema_version: 1,
        timezone: 'America/Sao_Paulo',
        weekly: [{ days: [1, 2, 3, 4, 5, 6], start: '10:00', end: '17:00' }],
      }),
    );
    expect(await screen.findByText(/horario de funcionamento salvo/i)).toBeInTheDocument();
    // Reflete o valor persistido devolvido pela API.
    expect(screen.getByLabelText('Inicio (janela 1)')).toHaveValue('10:00');
  });

  it('validacao local: inicio >= fim nao chama a API', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    const user = userEvent.setup();
    renderPage(ADMIN);

    fireEvent.change(await screen.findByLabelText('Fim (janela 1)'), {
      target: { value: '08:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/inicio deve ser anterior ao fim/i)).toBeInTheDocument();
    expect(service.saveBusinessHours).not.toHaveBeenCalled();
  });

  it('validacao local: janela sem nenhum dia nao chama a API', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue({
      ...CONFIGURED,
      business_hours: { ...HOURS, weekly: [{ days: [1], start: '09:00', end: '17:00' }] },
    });
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('checkbox', { name: 'Seg' })); // desmarca
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/selecione pelo menos um dia/i)).toBeInTheDocument();
    expect(service.saveBusinessHours).not.toHaveBeenCalled();
  });

  it('adiciona e remove janelas', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Adicionar janela' }));
    expect(screen.getByLabelText('Inicio (janela 2)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover janela 2' }));
    expect(screen.queryByLabelText('Inicio (janela 2)')).not.toBeInTheDocument();
    // Com uma unica janela nao ha como remover (o backend exige pelo menos uma).
    expect(screen.queryByRole('button', { name: /remover janela/i })).not.toBeInTheDocument();
  });

  it('erro do servidor ao salvar (422) e exibido', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    vi.mocked(service.saveBusinessHours).mockRejectedValue(
      new ApiError(422, 'BUSINESS_HOURS_INVALID', 'Horario de funcionamento invalido.'),
    );
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Horario de funcionamento invalido.')).toBeInTheDocument();
    expect(screen.queryByText(/horario de funcionamento salvo/i)).not.toBeInTheDocument();
  });

  it('403 ao salvar mostra mensagem de permissao', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    vi.mocked(service.saveBusinessHours).mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x'));
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/nao tem permissao para alterar/i)).toBeInTheDocument();
  });

  it('falha ao carregar: mostra erro e permite tentar de novo', async () => {
    vi.mocked(service.getBusinessHours)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'))
      .mockResolvedValueOnce(CONFIGURED);
    const user = userEvent.setup();
    renderPage(ADMIN);

    expect(await screen.findByText(/nao foi possivel carregar o horario/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Inicio (janela 1)')).toHaveValue('09:00');
  });

  it('so leitura (sem tenant_settings:update): campos desabilitados e sem acoes de escrita', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(['tenant_settings:read']);

    expect(await screen.findByLabelText('Inicio (janela 1)')).toBeDisabled();
    expect(screen.getByLabelText('Fuso horario')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Seg' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar janela' })).not.toBeInTheDocument();
    expect(screen.getByText(/pode consultar, mas nao alterar/i)).toBeInTheDocument();
  });
});
