import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpportunityListPage } from './OpportunityListPage';
import * as service from '../services/opportunities';
import { makeOpportunity, PIPELINE, renderWithProviders } from '../test-utils';
import type { OpportunityListResponse } from '../types/opportunity';

vi.mock('../services/opportunities');

function page(overrides: Partial<OpportunityListResponse> = {}): OpportunityListResponse {
  return { data: [], page: 1, limit: 20, total: 0, ...overrides };
}

function mockPipelines() {
  vi.mocked(service.listPipelines).mockResolvedValue({
    data: [PIPELINE],
    page: 1,
    limit: 100,
    total: 1,
  });
}

describe('OpportunityListPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra carregamento antes da resposta', () => {
    mockPipelines();
    vi.mocked(service.listOpportunities).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });
    expect(screen.getByText(/carregando oportunidades/i)).toBeInTheDocument();
  });

  it('mostra estado vazio', async () => {
    mockPipelines();
    vi.mocked(service.listOpportunities).mockResolvedValue(page());
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });
    expect(await screen.findByText(/nenhuma oportunidade encontrada/i)).toBeInTheDocument();
  });

  it('mostra erro da API', async () => {
    mockPipelines();
    vi.mocked(service.listOpportunities).mockRejectedValue(new Error('falhou'));
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });
    expect(
      await screen.findByText(/não foi possível carregar as oportunidades/i),
    ).toBeInTheDocument();
  });

  it('lista cliente, etapa, valor e responsável', async () => {
    mockPipelines();
    vi.mocked(service.listOpportunities).mockResolvedValue(
      page({
        data: [makeOpportunity({ stage_id: 'st3', value: '1500.50' })],
        total: 1,
      }),
    );
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });

    expect(await screen.findByText('Cliente Alfa')).toBeInTheDocument();
    expect(await screen.findByText(/Proposta · R\$ 1\.500,50/)).toBeInTheDocument();
    expect(screen.getByText(/Responsável: Ana/)).toBeInTheDocument();
  });

  it('RBAC visual: botão "Nova oportunidade" só com opportunities:create', async () => {
    mockPipelines();
    vi.mocked(service.listOpportunities).mockResolvedValue(page());
    const { unmount } = renderWithProviders(<OpportunityListPage />, {
      permissions: ['opportunities:read'],
    });
    await screen.findByText(/nenhuma oportunidade encontrada/i);
    expect(screen.queryByRole('button', { name: 'Nova oportunidade' })).not.toBeInTheDocument();
    unmount();

    vi.mocked(service.listOpportunities).mockResolvedValue(page());
    renderWithProviders(<OpportunityListPage />, {
      permissions: ['opportunities:read', 'opportunities:create'],
    });
    expect(
      (await screen.findAllByRole('button', { name: 'Nova oportunidade' })).length,
    ).toBeGreaterThan(0);
  });

  it('filtros de pipeline, etapa e status são enviados à API (e voltam para a página 1)', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.listOpportunities).mockResolvedValue(page());
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });
    await screen.findByText(/nenhuma oportunidade encontrada/i);

    expect(screen.getByLabelText('Etapa')).toBeDisabled(); // depende de um pipeline escolhido.
    await user.selectOptions(await screen.findByLabelText('Pipeline'), 'p1');
    await user.selectOptions(screen.getByLabelText('Etapa'), 'st3');
    await user.selectOptions(screen.getByLabelText('Status'), 'open');

    await waitFor(() =>
      expect(service.listOpportunities).toHaveBeenLastCalledWith(
        expect.objectContaining({ pipeline_id: 'p1', stage_id: 'st3', status: 'open', page: 1 }),
      ),
    );
  });

  it('paginação: "Próxima" avança a página', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.listOpportunities).mockResolvedValue(
      page({ data: [makeOpportunity()], total: 45 }),
    );
    renderWithProviders(<OpportunityListPage />, { permissions: ['opportunities:read'] });

    await user.click(await screen.findByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(service.listOpportunities).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});
