import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { LeadDetailPage } from './LeadDetailPage';
import * as leadsService from '../services/leads';
import type { Lead, LeadSourceListResponse } from '../types/lead';

vi.mock('../services/leads');

function sourcesPage(): LeadSourceListResponse {
  return {
    data: [{ id: 's1', name: 'Site', created_at: '', updated_at: '' }],
    page: 1,
    limit: 100,
    total: 1,
  };
}

function renderPage(lead: Lead, permissions: string[] = []) {
  vi.mocked(leadsService.getLead).mockResolvedValue(lead);
  vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());

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
        <MemoryRouter initialEntries={[`/leads/${lead.id}`]}>
          <Routes>
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/leads" element={<p>Lista de leads</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function newLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'l1',
    status: 'new',
    source_id: 's1',
    customer_id: null,
    owner_id: null,
    disqualify_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('LeadDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra status e origem do lead', async () => {
    renderPage(newLead(), ['leads:read']);
    expect(await screen.findByText('Novo')).toBeInTheDocument();
    expect(screen.getByText(/site/i)).toBeInTheDocument();
  });

  it('lead novo: mostra Qualificar e Desqualificar, nao mostra Reabrir', async () => {
    renderPage(newLead(), ['leads:read', 'leads:update']);
    await screen.findByText('Novo');
    expect(screen.getByRole('button', { name: /^qualificar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desqualificar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reabrir/i })).not.toBeInTheDocument();
  });

  it('lead desqualificado: mostra Reabrir, nao mostra Qualificar', async () => {
    renderPage(newLead({ status: 'disqualified', disqualify_reason: 'Sem orcamento' }), [
      'leads:read',
      'leads:update',
    ]);
    await screen.findByText('Desqualificado');
    expect(screen.getByRole('button', { name: /reabrir/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^qualificar$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/sem orcamento/i)).toBeInTheDocument();
  });

  it('RBAC visual: sem leads:update, nao mostra nenhuma acao de transicao', async () => {
    renderPage(newLead(), ['leads:read']);
    await screen.findByText('Novo');
    expect(screen.queryByRole('button', { name: /^qualificar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /desqualificar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /converter/i })).not.toBeInTheDocument();
  });

  it('qualifica o lead ao clicar em Qualificar', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.qualifyLead).mockResolvedValue(newLead({ status: 'qualified' }));
    renderPage(newLead(), ['leads:read', 'leads:update']);

    await user.click(await screen.findByRole('button', { name: /^qualificar$/i }));
    await waitFor(() => expect(leadsService.qualifyLead).toHaveBeenCalledWith('l1'));
  });

  it('desqualifica exigindo motivo', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.disqualifyLead).mockResolvedValue(
      newLead({ status: 'disqualified', disqualify_reason: 'Sem interesse' }),
    );
    renderPage(newLead(), ['leads:read', 'leads:update']);

    await user.click(await screen.findByRole('button', { name: /desqualificar/i }));
    await user.type(screen.getByLabelText(/motivo/i), 'Sem interesse');
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() =>
      expect(leadsService.disqualifyLead).toHaveBeenCalledWith('l1', 'Sem interesse'),
    );
  });

  it('reabre um lead desqualificado', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.reopenLead).mockResolvedValue(newLead({ status: 'new' }));
    renderPage(newLead({ status: 'disqualified', disqualify_reason: 'X' }), [
      'leads:read',
      'leads:update',
    ]);

    await user.click(await screen.findByRole('button', { name: /reabrir/i }));
    await waitFor(() => expect(leadsService.reopenLead).toHaveBeenCalledWith('l1'));
  });

  it('lead convertido com cliente: oferece "Criar oportunidade" so com opportunities:create', async () => {
    const converted = newLead({ status: 'converted', customer_id: 'c1' });
    const { unmount } = renderPage(converted, ['leads:read', 'opportunities:create']);
    expect(await screen.findByRole('button', { name: 'Criar oportunidade' })).toBeInTheDocument();
    unmount();

    renderPage(converted, ['leads:read']);
    await screen.findByText('Convertido');
    expect(screen.queryByRole('button', { name: 'Criar oportunidade' })).not.toBeInTheDocument();
  });

  it('lead ainda nao convertido nao oferece "Criar oportunidade"', async () => {
    renderPage(newLead(), ['leads:read', 'opportunities:create']);
    await screen.findByText('Novo');
    expect(screen.queryByRole('button', { name: 'Criar oportunidade' })).not.toBeInTheDocument();
  });

  it('exclusao pede confirmacao antes de chamar a API', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.deleteLead).mockResolvedValue(undefined);
    renderPage(newLead(), ['leads:read', 'leads:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    expect(leadsService.deleteLead).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirmar exclusão/i }));
    await waitFor(() => expect(leadsService.deleteLead).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText('Lista de leads')).toBeInTheDocument();
  });
});
