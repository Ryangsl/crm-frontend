import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PipelineBoardPage } from './PipelineBoardPage';
import * as service from '../services/opportunities';
import { makeOpportunity, PIPELINE, renderWithProviders } from '../test-utils';

vi.mock('../services/opportunities');

const PERMS = ['opportunities:read', 'pipelines:read'];

describe('PipelineBoardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra carregamento', () => {
    vi.mocked(service.listPipelines).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });
    expect(screen.getByText(/carregando pipeline/i)).toBeInTheDocument();
  });

  it('mostra erro', async () => {
    vi.mocked(service.listPipelines).mockRejectedValue(new Error('falhou'));
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });
    expect(await screen.findByText(/não foi possível carregar o pipeline/i)).toBeInTheDocument();
  });

  it('sem pipelines: estado vazio', async () => {
    vi.mocked(service.listPipelines).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });
    expect(await screen.findByText(/nenhum pipeline cadastrado/i)).toBeInTheDocument();
  });

  it('carrega o pipeline padrão e mostra o Kanban com as oportunidades nas etapas', async () => {
    vi.mocked(service.listPipelines).mockResolvedValue({
      data: [PIPELINE],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(service.listPipelineOpportunities).mockResolvedValue({
      data: [makeOpportunity({ stage_id: 'st3', customer: { id: 'c9', name: 'Cliente Zeta' } })],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });

    const proposta = await screen.findByRole('region', { name: 'Etapa Proposta' });
    expect(within(proposta).getByText('Cliente Zeta')).toBeInTheDocument();
    expect(service.listPipelineOpportunities).toHaveBeenCalledWith('p1', { limit: 100 });
  });

  it('avisa quando há mais oportunidades do que o limite do quadro', async () => {
    vi.mocked(service.listPipelines).mockResolvedValue({
      data: [PIPELINE],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(service.listPipelineOpportunities).mockResolvedValue({
      data: [makeOpportunity()],
      page: 1,
      limit: 100,
      total: 250,
    });
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });

    expect(
      await screen.findByText(/exibindo as 100 oportunidades mais recentes de 250/i),
    ).toBeInTheDocument();
  });

  it('RBAC visual: "Nova oportunidade" só com opportunities:create', async () => {
    vi.mocked(service.listPipelines).mockResolvedValue({
      data: [PIPELINE],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(service.listPipelineOpportunities).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
    renderWithProviders(<PipelineBoardPage />, { permissions: PERMS });
    await screen.findByRole('region', { name: 'Etapa Novo' });
    expect(screen.queryByRole('button', { name: 'Nova oportunidade' })).not.toBeInTheDocument();
  });
});
