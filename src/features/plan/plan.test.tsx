import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/app/pages/HomePage';
import { Button } from '@/components/ui/Button';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError, apiPost, setUnauthorizedHandler } from '@/services/api';
import { PlanAccessProvider } from './components/PlanAccessProvider';
import { isPermissionDenied } from './lib/labels';
import { TrialBanner } from './components/TrialBanner';
import { TrialShellNotice } from './components/TrialShellNotice';
import { UsageIndicators } from './components/UsageIndicators';
import { PlanPage } from './pages/PlanPage';
import * as planService from './services/plan';
import type { PlanSituation, PlanUsage } from './types/plan';

vi.mock('./services/plan');

const trialFeatures = {
  dashboard_basic: true,
  customers: true,
  leads: true,
  lead_distribution: true,
  pipeline: true,
  opportunities: true,
  follow_ups: true,
  conversations: true,
  advanced_reports: false,
  automations: false,
  external_integrations: false,
  whatsapp: false,
};

function situation(overrides: Partial<PlanSituation> = {}): PlanSituation {
  return {
    plan: { code: 'trial', name: 'Trial' },
    tenant_status: 'trial',
    state: 'trial_active',
    write_allowed: true,
    trial: {
      started_at: '2026-11-01T12:00:00.000Z',
      ends_at: '2026-11-15T12:00:00.000Z',
      total_days: 14,
      days_remaining: 10,
      near_expiry: false,
    },
    limits: { users: 3, leads: 100, customers: 100, opportunities: 30, storage_bytes: 104857600 },
    features: trialFeatures,
    ...overrides,
  };
}

const EXPIRED = situation({
  state: 'trial_expired',
  write_allowed: false,
  trial: {
    started_at: '2026-10-01T12:00:00.000Z',
    ends_at: '2026-10-15T12:00:00.000Z',
    total_days: 14,
    days_remaining: 0,
    near_expiry: false,
  },
});
const NOT_STARTED = situation({
  state: 'trial_not_started',
  write_allowed: false,
  trial: {
    started_at: null,
    ends_at: null,
    total_days: 14,
    days_remaining: null,
    near_expiry: false,
  },
});
const CONTRACTED = situation({
  plan: { code: 'starter', name: 'Starter' },
  tenant_status: 'active',
  state: 'active',
  trial: null,
});

const USAGE: PlanUsage = {
  warning_percent: 80,
  resources: [
    { resource: 'users', used: 3, limit: 3, percent: 100, state: 'reached', monitored: true },
    { resource: 'leads', used: 80, limit: 100, percent: 80, state: 'warning', monitored: true },
    { resource: 'customers', used: 12, limit: 100, percent: 12, state: 'normal', monitored: true },
    {
      resource: 'opportunities',
      used: 0,
      limit: null,
      percent: null,
      state: 'normal',
      monitored: true,
    },
    {
      resource: 'storage_bytes',
      used: null,
      limit: 104857600,
      percent: null,
      state: 'normal',
      monitored: false,
    },
  ],
};

function renderApp(ui: ReactElement, { permissions = [] as string[], path = '/' } = {}) {
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
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(planService.getPlanSituation).mockResolvedValue(situation());
  vi.mocked(planService.getPlanUsage).mockResolvedValue(USAGE);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('TrialBanner', () => {
  it('trial ativo: dias restantes, data de expiração, progresso e caminho para os planos', () => {
    renderApp(<TrialBanner situation={situation()} />);

    expect(screen.getByText('Período de avaliação ativo')).toBeInTheDocument();
    expect(screen.getByText(/10 dias restantes/)).toBeInTheDocument();
    expect(screen.getByText(/15\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '29');
    expect(screen.getByRole('link', { name: 'Conhecer os planos' })).toHaveAttribute(
      'href',
      '/plan',
    );
  });

  it('próximo do vencimento: troca o destaque', () => {
    const trial = { ...situation().trial!, days_remaining: 1, near_expiry: true };
    renderApp(<TrialBanner situation={situation({ trial })} />);

    expect(screen.getByText('Sua avaliação está terminando')).toBeInTheDocument();
    expect(screen.getByText(/1 dia restante/)).toBeInTheDocument();
  });

  it('expirado: informa consulta preservada e o caminho de contratação, sem bloquear a tela', () => {
    renderApp(<TrialBanner situation={EXPIRED} />);

    expect(screen.getByText('Período de avaliação encerrado')).toBeInTheDocument();
    expect(screen.getByText(/dados estão preservados/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conhecer os planos' })).toBeInTheDocument();
  });

  it('plano contratado: não mostra nada de avaliação', () => {
    const { container } = renderApp(<TrialBanner situation={CONTRACTED} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('não iniciado: quem pode inicia uma única vez, e a tela reflete o novo estado', async () => {
    vi.mocked(planService.startTrial).mockResolvedValue(situation());
    renderApp(<TrialBanner situation={NOT_STARTED} />, { permissions: ['plan:manage'] });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar avaliação de 14 dias' }));

    await waitFor(() => expect(planService.startTrial).toHaveBeenCalledTimes(1));
  });

  it('não iniciado: quem não pode é orientado e não vê o botão', () => {
    renderApp(<TrialBanner situation={NOT_STARTED} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/peça a um administrador/)).toBeInTheDocument();
  });

  it('falha ao iniciar não vira erro técnico', async () => {
    vi.mocked(planService.startTrial).mockRejectedValue(new Error('HTTP 500'));
    renderApp(<TrialBanner situation={NOT_STARTED} />, { permissions: ['plan:manage'] });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar avaliação de 14 dias' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível iniciar a avaliação',
    );
    expect(screen.queryByText(/HTTP 500/)).not.toBeInTheDocument();
  });
});

describe('UsageIndicators', () => {
  it('mostra consumo e limite com os três estados', async () => {
    renderApp(<UsageIndicators enabled />);

    expect(await screen.findByTestId('usage-users')).toHaveTextContent('3 / 3');
    expect(screen.getByTestId('usage-users')).toHaveTextContent('Limite atingido');
    expect(screen.getByTestId('usage-leads')).toHaveTextContent('80 / 100');
    expect(screen.getByTestId('usage-leads')).toHaveTextContent('Próximo do limite');
    expect(screen.getByTestId('usage-customers')).toHaveTextContent('12 / 100');
    expect(screen.getByTestId('usage-customers')).not.toHaveTextContent('limite atingido');
  });

  it('armazenamento mostra o limite configurado e não apresenta zero como medição', async () => {
    renderApp(<UsageIndicators enabled />);

    const storage = await screen.findByTestId('usage-storage_bytes');
    expect(storage).toHaveTextContent('100 MB configurados');
    expect(storage).toHaveTextContent('Consumo ainda não monitorado');
    expect(storage).not.toHaveTextContent(/(^|[^0-9])0 MB/);
    expect(within(storage).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('recurso sem limite não tem barra', async () => {
    renderApp(<UsageIndicators enabled />);

    const row = await screen.findByTestId('usage-opportunities');
    expect(row).toHaveTextContent('sem limite');
    expect(within(row).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('sem permissão não consulta', () => {
    renderApp(<UsageIndicators enabled={false} />);

    expect(planService.getPlanUsage).not.toHaveBeenCalled();
  });

  it('erro é tratado com nova tentativa', async () => {
    vi.mocked(planService.getPlanUsage).mockRejectedValueOnce(new Error('x'));
    renderApp(<UsageIndicators enabled />);

    expect(await screen.findByText('Não foi possível carregar o consumo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByTestId('usage-indicators')).toBeInTheDocument();
  });
});

describe('modo de consulta', () => {
  const screenWithButtons = (
    <PlanAccessProvider>
      <TrialShellNotice />
      <Button writes>Novo cliente</Button>
      <Button>Filtrar</Button>
    </PlanAccessProvider>
  );

  it('trial expirado: ação de escrita desabilitada com orientação; o resto segue funcionando', async () => {
    vi.mocked(planService.getPlanSituation).mockResolvedValue(EXPIRED);
    renderApp(screenWithButtons, { path: '/customers' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Novo cliente' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toHaveAttribute(
      'title',
      expect.stringContaining('período de avaliação terminou'),
    );
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeEnabled();
    expect(screen.getByTestId('trial-shell-notice')).toHaveTextContent('Modo de consulta');
  });

  it('trial ativo: nada desabilitado e nenhum aviso permanente', async () => {
    renderApp(screenWithButtons, { path: '/customers' });

    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toBeEnabled();
    expect(screen.queryByTestId('trial-shell-notice')).not.toBeInTheDocument();
  });

  it('próximo do vencimento não persegue o usuário pelas outras telas', async () => {
    const trial = { ...situation().trial!, days_remaining: 2, near_expiry: true };
    vi.mocked(planService.getPlanSituation).mockResolvedValue(situation({ trial }));
    renderApp(screenWithButtons, { path: '/customers' });

    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalled());
    expect(screen.queryByTestId('trial-shell-notice')).not.toBeInTheDocument();
  });

  it('falha ao consultar o plano nunca bloqueia nada: o backend é a autoridade', async () => {
    vi.mocked(planService.getPlanSituation).mockRejectedValue(new Error('x'));
    renderApp(screenWithButtons, { path: '/customers' });

    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toBeEnabled();
  });
});

describe('avisos quando a API recusa por causa do plano', () => {
  const respondWith = (status: number, body: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

  it('limite atingido: diz qual, consumo e máximo, sem erro técnico', async () => {
    respondWith(403, {
      error: { code: 'PLAN_LIMIT_REACHED', message: 'm', details: [] },
      plan_limit: { resource: 'leads', used: 100, limit: 100 },
    });
    renderApp(<PlanAccessProvider>conteudo</PlanAccessProvider>);

    await expect(apiPost('/v1/leads', {})).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });

    const notice = await screen.findByTestId('plan-error-notice');
    expect(notice).toHaveTextContent('Limite de Leads atingido');
    expect(notice).toHaveTextContent('100 de 100');
    expect(notice).toHaveTextContent('registros existentes continuam disponíveis');
    expect(notice).not.toHaveTextContent('PLAN_LIMIT_REACHED');
    expect(screen.getByRole('link', { name: 'Conhecer os planos' })).toBeInTheDocument();
  });

  it('TRIAL_EXPIRED não encerra a sessão e atualiza a situação do plano', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    respondWith(403, { error: { code: 'TRIAL_EXPIRED', message: 'm', details: [] } });
    renderApp(<PlanAccessProvider>conteudo</PlanAccessProvider>);
    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalledTimes(1));

    await expect(apiPost('/v1/customers', {})).rejects.toMatchObject({ code: 'TRIAL_EXPIRED' });

    expect(await screen.findByTestId('plan-error-notice')).toHaveTextContent(
      'Período de avaliação encerrado',
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalledTimes(2));
  });

  it('outros 403 não geram aviso de plano', async () => {
    respondWith(403, { error: { code: 'FORBIDDEN', message: 'm', details: [] } });
    renderApp(<PlanAccessProvider>conteudo</PlanAccessProvider>);

    await expect(apiPost('/v1/x', {})).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(screen.queryByTestId('plan-error-notice')).not.toBeInTheDocument();
  });

  it('o aviso pode ser fechado', async () => {
    respondWith(403, { error: { code: 'FEATURE_NOT_AVAILABLE', message: 'm', details: [] } });
    renderApp(<PlanAccessProvider>conteudo</PlanAccessProvider>);
    await expect(apiPost('/v1/x', {})).rejects.toBeDefined();

    fireEvent.click(await screen.findByRole('button', { name: 'Fechar' }));

    expect(screen.queryByTestId('plan-error-notice')).not.toBeInTheDocument();
  });
});

describe('isPermissionDenied', () => {
  it('recusa por causa do plano não é falta de permissão', () => {
    for (const code of [
      'TRIAL_EXPIRED',
      'TRIAL_NOT_STARTED',
      'PLAN_LIMIT_REACHED',
      'FEATURE_NOT_AVAILABLE',
    ]) {
      expect(isPermissionDenied(new ApiError(403, code, 'm'))).toBe(false);
    }
    expect(isPermissionDenied(new ApiError(403, 'FORBIDDEN', 'm'))).toBe(true);
    expect(isPermissionDenied(new ApiError(404, 'NOT_FOUND', 'm'))).toBe(false);
    expect(isPermissionDenied(new Error('x'))).toBe(false);
  });
});

describe('páginas', () => {
  it('Início em trial: banner e consumo para quem tem plan:read', async () => {
    renderApp(<HomePage />, { permissions: ['plan:read'] });

    expect(await screen.findByText('Período de avaliação ativo')).toBeInTheDocument();
    expect(await screen.findByTestId('usage-indicators')).toBeInTheDocument();
  });

  it('Início em trial sem plan:read: banner sem consumo', async () => {
    renderApp(<HomePage />);

    expect(await screen.findByText('Período de avaliação ativo')).toBeInTheDocument();
    expect(planService.getPlanUsage).not.toHaveBeenCalled();
  });

  it('Início com plano contratado não mostra avaliação nem consumo', async () => {
    vi.mocked(planService.getPlanSituation).mockResolvedValue(CONTRACTED);
    renderApp(<HomePage />, { permissions: ['plan:read'] });

    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalled());
    expect(screen.queryByText(/avaliação/i)).not.toBeInTheDocument();
    expect(planService.getPlanUsage).not.toHaveBeenCalled();
  });

  it('Início continua utilizável se a situação do plano não carregar', async () => {
    vi.mocked(planService.getPlanSituation).mockRejectedValue(new Error('x'));
    renderApp(<HomePage />, { permissions: ['plan:read'] });

    await waitFor(() => expect(planService.getPlanSituation).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Olá, Ana!' })).toBeInTheDocument();
    expect(screen.getByLabelText('Período')).toBeInTheDocument();
  });

  it('Plano: lista só o que existe no produto e orienta a contratação sem inventar contato', async () => {
    renderApp(<PlanPage />, { permissions: ['plan:read'] });

    expect(await screen.findByText('Plano atual: Trial')).toBeInTheDocument();
    expect(screen.getByText('Distribuição de Leads')).toBeInTheDocument();
    expect(screen.getByText('Conversas')).toBeInTheDocument();
    expect(screen.queryByText(/Relatórios/)).not.toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/)).not.toBeInTheDocument();
    expect(screen.getByText(/Fale com o seu contato comercial/)).toBeInTheDocument();
  });

  it('Plano usa o link comercial quando configurado', async () => {
    vi.stubEnv('VITE_SALES_CONTACT_URL', 'https://exemplo.test/contato');
    renderApp(<PlanPage />);

    expect(await screen.findByRole('link', { name: 'Falar com o comercial' })).toHaveAttribute(
      'href',
      'https://exemplo.test/contato',
    );
    vi.unstubAllEnvs();
  });

  it('Plano: erro é tratado', async () => {
    vi.mocked(planService.getPlanSituation).mockRejectedValue(new Error('x'));
    renderApp(<PlanPage />);

    expect(
      await screen.findByText('Não foi possível carregar a situação do plano'),
    ).toBeInTheDocument();
  });
});
