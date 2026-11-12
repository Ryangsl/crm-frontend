import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/app/pages/HomePage';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as followUp from '@/features/follow-up/services/followUp';
import * as leads from '@/features/leads/services/leads';
import * as plan from '@/features/plan/services/plan';
import * as service from './services/dashboard';
import type { DashboardSummary } from './services/dashboard';

vi.mock('./services/dashboard', async (original) => ({
  ...(await original<typeof service>()),
  getDashboardSummary: vi.fn(),
}));
vi.mock('@/features/plan/services/plan');
vi.mock('@/features/follow-up/services/followUp');
vi.mock('@/features/leads/services/leads');
vi.mock('@/features/status/services/health', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: 'ok', details: {} }),
}));

const SUMMARY: DashboardSummary = {
  period_days: 30,
  generated_at: '2026-11-05T12:00:00.000Z',
  customers: { total: 96, delta_percent: 8 },
  leads: { total: 248, delta_percent: -12 },
  opportunities: {
    open_count: 42,
    open_value: 1248000,
    count_delta_percent: null,
    value_delta_percent: 0,
  },
  pipeline: {
    id: 'p1',
    name: 'Vendas',
    total_value: 4000,
    total_count: 3,
    stages: [
      { id: 's1', name: 'Proposta', count: 2, value: 1500, percent: 67 },
      { id: 's2', name: 'Negociação', count: 1, value: 2500, percent: 33 },
    ],
  },
  evolution: {
    bucket: 'day',
    points: [
      { date: '2026-11-03T00:00:00.000Z', leads: 2, opportunities: 1, won: 0 },
      { date: '2026-11-04T00:00:00.000Z', leads: 5, opportunities: 3, won: 1 },
    ],
  },
};

function renderHome(permissions: string[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana Souza', email: 'a@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key: string) => permissions.includes(key),
  };
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(service.getDashboardSummary).mockResolvedValue(SUMMARY);
  vi.mocked(plan.getPlanSituation).mockRejectedValue(new Error('sem plano'));
  vi.mocked(followUp.listScheduledTasks).mockResolvedValue({
    data: [
      {
        id: 't1',
        title: 'Ligar para cliente',
        assigned_to: 'u1',
        due_at: '2026-11-05T15:00:00.000Z',
        status: 'pending',
        entity_type: null,
        entity_id: null,
        created_at: '',
        updated_at: '',
      },
    ],
    page: 1,
    limit: 100,
    total: 1,
  });
  vi.mocked(followUp.listScheduledAppointments).mockResolvedValue({
    data: [],
    page: 1,
    limit: 100,
    total: 0,
  });
  vi.mocked(leads.listLeads).mockResolvedValue({
    data: [
      {
        id: 'l1',
        status: 'new',
        source_id: 's1',
        customer_id: null,
        owner_id: null,
        name: 'João Mendes',
        disqualify_reason: null,
        created_at: '2026-11-05T12:00:00.000Z',
        updated_at: '2026-11-05T12:00:00.000Z',
      },
    ],
    page: 1,
    limit: 5,
    total: 1,
  });
  vi.mocked(leads.listLeadSources).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
});

afterEach(() => vi.clearAllMocks());

describe('painel inicial', () => {
  it('cumprimenta o usuário pelo primeiro nome', async () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Olá, Ana!' })).toBeInTheDocument();
    await screen.findByRole('link', { name: /^Leads/ });
  });

  it('mostra os indicadores reais, com a variacao e a direção em texto', async () => {
    renderHome();

    const leadsCard = await screen.findByRole('link', { name: /^Leads/ });
    expect(leadsCard).toHaveTextContent('248');
    expect(leadsCard).toHaveTextContent('-12%');
    expect(leadsCard).toHaveAttribute('href', '/leads');
    expect(screen.getByText('Clientes').closest('a')).toHaveTextContent('+8%');
    expect(screen.getByText('Valor em aberto').closest('a')).toHaveTextContent(/1\.248\.000/);
  });

  it('sem base de comparacao, diz isso em vez de inventar um percentual', async () => {
    renderHome();

    const card = (await screen.findByText('Oportunidades em aberto')).closest('a')!;
    expect(card).toHaveTextContent('Sem base de comparação');
    expect(card).not.toHaveTextContent('%');
  });

  it('bloco sem permissão não aparece', async () => {
    vi.mocked(service.getDashboardSummary).mockResolvedValue({
      ...SUMMARY,
      leads: null,
      opportunities: null,
      pipeline: null,
    });
    renderHome();

    await screen.findByText('Clientes');
    expect(screen.queryByText('Oportunidades em aberto')).not.toBeInTheDocument();
    expect(screen.queryByText('Pipeline de oportunidades')).not.toBeInTheDocument();
  });

  it('trocar o período consulta de novo com o período escolhido', async () => {
    renderHome();
    await screen.findByRole('link', { name: /^Leads/ });

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '90' } });

    await waitFor(() => expect(service.getDashboardSummary).toHaveBeenCalledWith(90));
  });

  it('mostra o pipeline por etapa, com contagem e percentual', async () => {
    renderHome();

    const stage = (await screen.findByText('Proposta')).closest('li')!;
    expect(stage).toHaveTextContent('2');
    expect(stage).toHaveTextContent('67%');
    expect(within(stage).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
  });

  it('grafico: legenda de cada serie e tabela com os valores', async () => {
    renderHome();

    expect(await screen.findByRole('img', { name: /Evolução no período/ })).toBeInTheDocument();
    expect(screen.getAllByText('Vendas').length).toBeGreaterThan(0);
    expect(screen.getByText('Ver como tabela')).toBeInTheDocument();
  });

  it('período sem nenhum movimento não desenha um grafico vazio', async () => {
    vi.mocked(service.getDashboardSummary).mockResolvedValue({
      ...SUMMARY,
      evolution: {
        bucket: 'day',
        points: [{ date: '2026-11-04T00:00:00.000Z', leads: 0, opportunities: 0, won: 0 }],
      },
    });
    renderHome();

    expect(await screen.findByText('Sem movimentação no período.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Evolução/ })).not.toBeInTheDocument();
  });

  it('agenda do dia e últimos leads respeitam a permissão', async () => {
    renderHome(['tasks:read', 'leads:read', 'lead_sources:read']);

    expect(await screen.findByText('Ligar para cliente')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'João Mendes' })).toHaveAttribute(
      'href',
      '/leads/l1',
    );
    expect(followUp.listScheduledTasks).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: 'u1' }),
    );
  });

  it('sem permissão não consulta agenda nem leads', async () => {
    renderHome();
    await screen.findByRole('link', { name: /^Leads/ });

    expect(followUp.listScheduledTasks).not.toHaveBeenCalled();
    expect(leads.listLeads).not.toHaveBeenCalled();
    expect(screen.queryByText('Atividades de hoje')).not.toBeInTheDocument();
  });

  it('metas não existem no produto: o painel diz isso, sem número nenhum', async () => {
    renderHome();
    expect(await screen.findByText('Metas ainda não disponíveis')).toBeInTheDocument();
  });

  it('erro no resumo oferece nova tentativa e não esconde o resto', async () => {
    vi.mocked(service.getDashboardSummary).mockRejectedValue(new Error('x'));
    renderHome();

    expect(await screen.findByText('Não foi possível carregar o resumo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Olá, Ana!' })).toBeInTheDocument();
  });
});
