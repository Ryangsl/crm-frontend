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

describe('BusinessHoursRestrictionToggle (F4.7, so o Admin)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem tenant_settings:read (ex.: Gerente) nao renderiza nada nem consulta a API', () => {
    const { container } = renderToggle(['access_exceptions:manage', 'users:read']);
    expect(container).toBeEmptyDOMElement();
    expect(service.getRestrictionSetting).not.toHaveBeenCalled();
  });

  it('desligada por padrao: mostra o estado e o botao Ligar para o Admin', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN);
    expect(await screen.findByTestId('restriction-state')).toHaveTextContent('desligada');
    expect(screen.getByRole('button', { name: 'Ligar restricao' })).toBeEnabled();
  });

  it('ligar chama o servico com enabled=true e reflete o novo estado', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setRestrictionSetting).mockResolvedValue({ enabled: true });
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Ligar restricao' }));

    await waitFor(() => expect(service.setRestrictionSetting).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('button', { name: 'Desligar restricao' })).toBeInTheDocument();
    expect(screen.getByTestId('restriction-state')).toHaveTextContent('ligada');
  });

  it('desligar chama o servico com enabled=false', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: true });
    vi.mocked(service.setRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Desligar restricao' }));
    await waitFor(() => expect(service.setRestrictionSetting).toHaveBeenCalledWith(false));
  });

  it('sem horario valido: o botao Ligar fica desabilitado e orienta a salvar o horario', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    renderToggle(ADMIN, false);
    expect(await screen.findByRole('button', { name: 'Ligar restricao' })).toBeDisabled();
    expect(screen.getByText(/salve um horario de funcionamento valido/i)).toBeInTheDocument();
  });

  it('o backend recusa ativar sem horario valido: mostra a mensagem do codigo', async () => {
    const user = userEvent.setup();
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: false });
    vi.mocked(service.setRestrictionSetting).mockRejectedValue(
      new ApiError(422, 'BUSINESS_HOURS_REQUIRED', 'x'),
    );
    renderToggle(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Ligar restricao' }));
    expect(
      await screen.findByText(/horario de funcionamento valido antes de ativar/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('restriction-state')).toHaveTextContent('desligada');
  });

  it('quem so le (tenant_settings:read) ve o estado mas nao tem botao: so o Admin altera', async () => {
    vi.mocked(service.getRestrictionSetting).mockResolvedValue({ enabled: true });
    renderToggle(['tenant_settings:read']);
    expect(await screen.findByTestId('restriction-state')).toHaveTextContent('ligada');
    expect(screen.queryByRole('button', { name: /restricao/i })).not.toBeInTheDocument();
    expect(screen.getByText(/somente o admin pode ligar ou desligar/i)).toBeInTheDocument();
  });
});
