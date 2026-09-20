import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpportunityDetailPage } from './OpportunityDetailPage';
import * as service from '../services/opportunities';
import { makeOpportunity, PIPELINE, renderWithProviders } from '../test-utils';
import type { Opportunity } from '../types/opportunity';

vi.mock('../services/opportunities');

function renderPage(opportunity: Opportunity, permissions: string[]) {
  vi.mocked(service.getOpportunity).mockResolvedValue(opportunity);
  vi.mocked(service.getPipeline).mockResolvedValue(PIPELINE);
  return renderWithProviders(
    <Routes>
      <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
      <Route path="/opportunities" element={<p>Lista de oportunidades</p>} />
    </Routes>,
    { permissions, initialEntry: `/opportunities/${opportunity.id}` },
  );
}

const FULL = ['opportunities:read', 'opportunities:update', 'opportunities:delete'];

describe('OpportunityDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra cliente, etapa (pelo pipeline), valor e responsável', async () => {
    renderPage(makeOpportunity({ stage_id: 'st3', value: '1500.50' }), ['opportunities:read']);

    expect(await screen.findByRole('heading', { name: 'Cliente Alfa' })).toBeInTheDocument();
    expect(await screen.findByText(/Etapa: Proposta · Valor: R\$ 1\.500,50/)).toBeInTheDocument();
    expect(screen.getByText('Responsável: Ana')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
  });

  it('oportunidade aberta com opportunities:update: Mover, Ganhar e Perder', async () => {
    renderPage(makeOpportunity(), FULL);
    await screen.findByRole('heading', { name: 'Cliente Alfa' });
    expect(screen.getByRole('button', { name: 'Mover' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ganhar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Perder' })).toBeInTheDocument();
  });

  it('RBAC visual: sem update/delete não há ações nem Excluir', async () => {
    renderPage(makeOpportunity(), ['opportunities:read']);
    await screen.findByRole('heading', { name: 'Cliente Alfa' });
    for (const name of ['Mover', 'Ganhar', 'Perder', 'Excluir', 'Editar']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('estado terminal: ganha/perdida não oferece Mover/Ganhar/Perder e mostra o motivo da perda', async () => {
    renderPage(
      makeOpportunity({ status: 'lost', stage_id: 'st5', lost_reason: 'Escolheu o concorrente' }),
      FULL,
    );
    await screen.findByText('Perdida');
    expect(screen.getByText(/não pode voltar ao pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Escolheu o concorrente/)).toBeInTheDocument();
    for (const name of ['Mover', 'Ganhar', 'Perder']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('ganhar: abre o painel, confirma e chama win', async () => {
    const user = userEvent.setup();
    vi.mocked(service.winOpportunity).mockResolvedValue(
      makeOpportunity({ status: 'won', stage_id: 'st4' }),
    );
    renderPage(makeOpportunity({ value: '50.00' }), FULL);

    await user.click(await screen.findByRole('button', { name: 'Ganhar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar ganho' }));
    await waitFor(() => expect(service.winOpportunity).toHaveBeenCalledWith('o1'));
  });

  it('perder: exige o motivo e chama lose', async () => {
    const user = userEvent.setup();
    vi.mocked(service.loseOpportunity).mockResolvedValue(
      makeOpportunity({ status: 'lost', stage_id: 'st5' }),
    );
    renderPage(makeOpportunity(), FULL);

    await user.click(await screen.findByRole('button', { name: 'Perder' }));
    await user.type(screen.getByLabelText(/motivo da perda/i), 'Sem orçamento');
    await user.click(screen.getByRole('button', { name: 'Confirmar perda' }));
    await waitFor(() =>
      expect(service.loseOpportunity).toHaveBeenCalledWith('o1', 'Sem orçamento'),
    );
  });

  it('mover com salto pede justificativa (fluxo completo pelo detalhe)', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity).mockResolvedValue(makeOpportunity({ stage_id: 'st3' }));
    renderPage(makeOpportunity(), FULL);

    await user.click(await screen.findByRole('button', { name: 'Mover' }));
    await user.selectOptions(screen.getByLabelText('Mover para'), 'st3');
    await user.type(screen.getByLabelText(/justificativa/i), 'Pulou a negociação');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() =>
      expect(service.moveOpportunity).toHaveBeenCalledWith('o1', {
        stage_id: 'st3',
        justification: 'Pulou a negociação',
      }),
    );
  });

  it('exclusão pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup();
    vi.mocked(service.deleteOpportunity).mockResolvedValue(undefined);
    renderPage(makeOpportunity(), FULL);

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    expect(service.deleteOpportunity).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => expect(service.deleteOpportunity).toHaveBeenCalledWith('o1'));
    expect(await screen.findByText('Lista de oportunidades')).toBeInTheDocument();
  });

  it('mostra erro ao carregar', async () => {
    vi.mocked(service.getOpportunity).mockRejectedValue(new Error('falhou'));
    vi.mocked(service.getPipeline).mockResolvedValue(PIPELINE);
    renderWithProviders(
      <Routes>
        <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
      </Routes>,
      { permissions: FULL, initialEntry: '/opportunities/o1' },
    );
    expect(
      await screen.findByText(/não foi possível carregar a oportunidade/i),
    ).toBeInTheDocument();
  });
});
