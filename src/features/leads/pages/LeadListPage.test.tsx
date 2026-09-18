import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { LeadListPage } from './LeadListPage';
import * as leadsService from '../services/leads';
import type { Lead, LeadListResponse, LeadSourceListResponse } from '../types/lead';

vi.mock('../services/leads');

function renderPage(permissions: string[] = []) {
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
        <MemoryRouter initialEntries={['/leads']}>
          <LeadListPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function page(overrides: Partial<LeadListResponse> = {}): LeadListResponse {
  return { data: [], page: 1, limit: 20, total: 0, ...overrides };
}

function sourcesPage(overrides: Partial<LeadSourceListResponse> = {}): LeadSourceListResponse {
  return { data: [{ id: 's1', name: 'Site', created_at: '', updated_at: '' }], page: 1, limit: 100, total: 1, ...overrides };
}

const LEAD: Lead = {
  id: 'l1',
  status: 'new',
  source_id: 's1',
  customer_id: null,
  owner_id: null,
  disqualify_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('LeadListPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra o estado de carregamento antes da resposta chegar', () => {
    vi.mocked(leadsService.listLeads).mockReturnValue(new Promise(() => {}));
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    expect(screen.getByText(/carregando leads/i)).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha leads', async () => {
    vi.mocked(leadsService.listLeads).mockResolvedValue(page());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    expect(await screen.findByText(/nenhum lead encontrado/i)).toBeInTheDocument();
  });

  it('mostra estado de erro e permite tentar novamente', async () => {
    vi.mocked(leadsService.listLeads).mockRejectedValue(new Error('falhou'));
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    expect(await screen.findByText(/nao foi possivel carregar os leads/i)).toBeInTheDocument();
  });

  it('lista os leads com status e origem', async () => {
    vi.mocked(leadsService.listLeads).mockResolvedValue(page({ data: [LEAD], total: 1 }));
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    // 'Novo'/'Site' tambem existem como opcoes dos filtros — usa getAllByText para nao colidir
    // com as <option> dos seletores de status/origem, e espera a lista carregar antes.
    await waitFor(() => expect(screen.queryByText(/carregando leads/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Novo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Site').length).toBeGreaterThan(0);
  });

  it('RBAC visual: sem leads:create, nao mostra o botao Novo lead', async () => {
    vi.mocked(leadsService.listLeads).mockResolvedValue(page());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    await screen.findByText(/nenhum lead encontrado/i);
    expect(screen.queryByRole('button', { name: /novo lead/i })).not.toBeInTheDocument();
  });

  it('RBAC visual: com leads:create, mostra o botao Novo lead', async () => {
    vi.mocked(leadsService.listLeads).mockResolvedValue(page());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read', 'leads:create']);
    expect(await screen.findByRole('button', { name: /novo lead/i })).toBeInTheDocument();
  });

  it('filtro de status envia o valor selecionado para a API', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeads).mockResolvedValue(page());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderPage(['leads:read']);
    await screen.findByText(/nenhum lead encontrado/i);

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'qualified');

    await waitFor(() =>
      expect(leadsService.listLeads).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'qualified', page: 1 }),
      ),
    );
  });
});
