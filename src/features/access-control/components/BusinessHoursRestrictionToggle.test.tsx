import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { BusinessHoursRestrictionToggle } from './BusinessHoursRestrictionToggle';
import * as service from '../services/accessControl';

vi.mock('../services/accessControl');

const ADMIN = ['tenant_settings:read', 'tenant_settings:update'];

function renderToggle(permissions: string[], hoursConfigured = true) {
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
        <BusinessHoursRestrictionToggle hoursConfigured={hoursConfigured} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('BusinessHoursRestrictionToggle (F4.7, só o Admin)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem tenant_settings:read (ex.: Gerente) não renderiza nada nem consulta a API', () => {
    const { container } = renderToggle(['access_exceptions:manage', 'users:read']);
    expect(container).toBeEmptyDOMElement();
    expect(service.getRestrictionSetting).not.toHaveBeenCalled();
  });

  it('desligada por padrão: mostra o estado e o botao Ligar para o Admin', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN);
    expect(await screen.findByTestId('restriction-state')).toHaveTextContent('desligada');
    expect(screen.getByRole('button', { name: 'Ligar restrição' })).toBeEnabled();
  });

  it('ligar chama o serviço com enabled=true e reflete o novo estado', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setRestrictionSetting).mockResolvedValue({ enabled: true });
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Ligar restrição' }));

    await waitFor(() => expect(service.setRestrictionSetting).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('button', { name: 'Desligar restrição' })).toBeInTheDocument();
    expect(screen.getByTestId('restriction-state')).toHaveTextContent('ligada');
  });

  it('desligar chama o serviço com enabled=false', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: true });
    vi.mocked(service.setRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Desligar restrição' }));
    await waitFor(() => expect(service.setRestrictionSetting).toHaveBeenCalledWith(false));
  });

  it('sem horário válido: o botao Ligar fica desabilitado e orienta a salvar o horário', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN, false);
    expect(await screen.findByRole('button', { name: 'Ligar restrição' })).toBeDisabled();
    expect(screen.getByText(/salve um horário de funcionamento válido/i)).toBeInTheDocument();
  });

  it('o backend recusa ativar sem horário válido: mostra a mensagem do código', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setRestrictionSetting).mockRejectedValue(
      new ApiError(422, 'BUSINESS_HOURS_REQUIRED', 'x'),
    );
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Ligar restrição' }));
    expect(
      await screen.findByText(/horário de funcionamento válido antes de ativar/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('restriction-state')).toHaveTextContent('desligada');
  });

  it('quem só le (tenant_settings:read) ve o estado mas não tem botao: só o Admin altera', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: true });
    renderToggle(['tenant_settings:read']);
    expect(await screen.findByTestId('restriction-state')).toHaveTextContent('ligada');
    expect(screen.queryByRole('button', { name: /restrição/i })).not.toBeInTheDocument();
    expect(screen.getByText(/somente o admin pode ligar ou desligar/i)).toBeInTheDocument();
  });
});
