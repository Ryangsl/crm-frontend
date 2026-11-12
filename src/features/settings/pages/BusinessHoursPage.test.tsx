import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { BusinessHoursPage } from './BusinessHoursPage';
import * as accessService from '@/features/access-control/services/accessControl';
import * as service from '../services/businessHours';
import type { BusinessHours, BusinessHoursResponse } from '../types/businessHours';

vi.mock('../services/businessHours');
vi.mock('@/features/access-control/services/accessControl');

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
  vi.mocked(accessService.getRestrictionSetting).mockResolvedValue({ enabled: false });
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
    expect(screen.getByText(/não tem permissão para acessar/i)).toBeInTheDocument();
    expect(service.getBusinessHours).not.toHaveBeenCalled();
  });

  it('mostra o carregamento e depois os valores persistidos', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(ADMIN);

    expect(screen.getByText(/carregando configuração/i)).toBeInTheDocument();
    expect(await screen.findByLabelText('Início (janela 1)')).toHaveValue('09:00');
    expect(screen.getByLabelText('Fim (janela 1)')).toHaveValue('17:00');
    expect(screen.getByLabelText('Fuso horário')).toHaveValue('America/Sao_Paulo');
    expect(screen.getByRole('checkbox', { name: 'Seg' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sab' })).not.toBeChecked();
    expect(screen.queryByText(/nenhum horário configurado/i)).not.toBeInTheDocument();
  });

  // F4.7: o horario deixou de ser so um registro, mas continua sem alterar disponibilidade e
  // distribuicao; so restringe o acesso se o Admin ligar a restricao (desligada por padrao).
  it('explica que o horário só restringe acesso se o Admin ligar a restrição', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(ADMIN);
    expect(await screen.findByText(/nunca altera a distribuição de leads/i)).toBeInTheDocument();
    expect(await screen.findByTestId('restriction-state')).toHaveTextContent('desligada');
  });

  it('só o Admin (tenant_settings:update) liga a restrição; quem só le ve o estado sem botao', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(['tenant_settings:read']);
    expect(await screen.findByTestId('restriction-state')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ligar restrição' })).not.toBeInTheDocument();
  });

  it('tenant sem configuração: mostra a sugestão e nada e gravado sem salvar', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(EMPTY);
    renderPage(ADMIN);

    expect(await screen.findByText(/nenhum horário configurado/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Início (janela 1)')).toHaveValue('08:00');
    expect(service.saveBusinessHours).not.toHaveBeenCalled();
  });

  it('salva alterações enviando o formato v1 e mostra confirmação', async () => {
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

    fireEvent.change(await screen.findByLabelText('Início (janela 1)'), {
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
    expect(await screen.findByText(/horário de funcionamento salvo/i)).toBeInTheDocument();
    // Reflete o valor persistido devolvido pela API.
    expect(screen.getByLabelText('Início (janela 1)')).toHaveValue('10:00');
  });

  it('validacao local: início >= fim não chama a API', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    const user = userEvent.setup();
    renderPage(ADMIN);

    fireEvent.change(await screen.findByLabelText('Fim (janela 1)'), {
      target: { value: '08:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/início deve ser anterior ao fim/i)).toBeInTheDocument();
    expect(service.saveBusinessHours).not.toHaveBeenCalled();
  });

  it('validacao local: janela sem nenhum dia não chama a API', async () => {
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
    expect(screen.getByLabelText('Início (janela 2)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover janela 2' }));
    expect(screen.queryByLabelText('Início (janela 2)')).not.toBeInTheDocument();
    // Com uma unica janela nao ha como remover (o backend exige pelo menos uma).
    expect(screen.queryByRole('button', { name: /remover janela/i })).not.toBeInTheDocument();
  });

  it('erro do servidor ao salvar (422) e exibido', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    vi.mocked(service.saveBusinessHours).mockRejectedValue(
      new ApiError(422, 'BUSINESS_HOURS_INVALID', 'Horário de funcionamento inválido.'),
    );
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Horário de funcionamento inválido.')).toBeInTheDocument();
    expect(screen.queryByText(/horário de funcionamento salvo/i)).not.toBeInTheDocument();
  });

  it('403 ao salvar mostra mensagem de permissão', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    vi.mocked(service.saveBusinessHours).mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'x'));
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/não tem permissão para alterar/i)).toBeInTheDocument();
  });

  it('falha ao carregar: mostra erro e permite tentar de novo', async () => {
    vi.mocked(service.getBusinessHours)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'))
      .mockResolvedValueOnce(CONFIGURED);
    const user = userEvent.setup();
    renderPage(ADMIN);

    expect(await screen.findByText(/não foi possível carregar o horário/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Início (janela 1)')).toHaveValue('09:00');
  });

  it('só leitura (sem tenant_settings:update): campos desabilitados e sem ações de escrita', async () => {
    vi.mocked(service.getBusinessHours).mockResolvedValue(CONFIGURED);
    renderPage(['tenant_settings:read']);

    expect(await screen.findByLabelText('Início (janela 1)')).toBeDisabled();
    expect(screen.getByLabelText('Fuso horário')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Seg' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar janela' })).not.toBeInTheDocument();
    expect(screen.getByText(/pode consultar, mas não alterar/i)).toBeInTheDocument();
  });
});
