import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KanbanBoard } from './KanbanBoard';
import * as service from '../services/opportunities';
import { makeOpportunity, PIPELINE, renderWithProviders } from '../test-utils';

vi.mock('../services/opportunities');

const OPPS = [
  makeOpportunity({
    id: 'o1',
    stage_id: 'st1',
    customer: { id: 'c1', name: 'Cliente Alfa' },
    value: '100.00',
  }),
  makeOpportunity({ id: 'o2', stage_id: 'st1', customer: { id: 'c2', name: 'Cliente Beta' } }),
  makeOpportunity({
    id: 'o3',
    stage_id: 'st3',
    customer: { id: 'c3', name: 'Cliente Gama' },
    value: '2500.00',
  }),
  makeOpportunity({
    id: 'o4',
    stage_id: 'st4',
    status: 'won',
    customer: { id: 'c4', name: 'Cliente Delta' },
    value: '900.00',
  }),
];

function column(name: string) {
  return screen.getByRole('region', { name: `Etapa ${name}` });
}

describe('KanbanBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cria uma coluna por etapa, na ordem, e distribui os cards pela etapa', () => {
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read'],
    });

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Novo', 'Negociação', 'Proposta', 'Ganho', 'Perdido']);

    expect(within(column('Novo')).getByText('Cliente Alfa')).toBeInTheDocument();
    expect(within(column('Novo')).getByText('Cliente Beta')).toBeInTheDocument();
    expect(within(column('Proposta')).getByText('Cliente Gama')).toBeInTheDocument();
    expect(within(column('Ganho')).getByText('Cliente Delta')).toBeInTheDocument();
    expect(within(column('Negociação')).getByText('Nenhuma oportunidade')).toBeInTheDocument();
  });

  it('mostra valor formatado, responsável e marcadores de etapa (exige valor / ganho / perda)', () => {
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read'],
    });

    expect(within(column('Proposta')).getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(within(column('Novo')).getByText('Sem valor')).toBeInTheDocument();
    expect(within(column('Novo')).getAllByText(/Responsável: Ana/)).toHaveLength(2);
    expect(within(column('Negociação')).getByText('Exige valor')).toBeInTheDocument();
    expect(within(column('Ganho')).getByText('Etapa de ganho')).toBeInTheDocument();
    expect(within(column('Perdido')).getByText('Etapa de perda')).toBeInTheDocument();
  });

  it('RBAC visual: sem opportunities:update não há ações de mover/ganhar/perder', () => {
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read'],
    });
    expect(screen.queryByRole('button', { name: 'Mover' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ganhar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Perder' })).not.toBeInTheDocument();
  });

  it('com opportunities:update, só oportunidades abertas têm ações (encerrada é terminal)', () => {
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read', 'opportunities:update'],
    });
    expect(within(column('Novo')).getAllByRole('button', { name: 'Mover' })).toHaveLength(2);
    expect(
      within(column('Ganho')).queryByRole('button', { name: 'Mover' }),
    ).not.toBeInTheDocument();
  });

  it('move um card pelo painel do próprio card (fluxo acessível, sem drag-and-drop)', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity).mockResolvedValue(
      makeOpportunity({ id: 'o1', stage_id: 'st2' }),
    );
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read', 'opportunities:update'],
    });

    const card = within(column('Novo')).getByText('Cliente Alfa').closest('article') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Mover' }));
    await user.selectOptions(within(card).getByLabelText('Mover para'), 'st2');
    await user.click(within(card).getByRole('button', { name: 'Mover' }));

    await waitFor(() =>
      expect(service.moveOpportunity).toHaveBeenCalledWith('o1', {
        stage_id: 'st2',
        justification: undefined,
      }),
    );
  });

  it('salto pelo card exige justificativa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<KanbanBoard pipeline={PIPELINE} opportunities={OPPS} />, {
      permissions: ['opportunities:read', 'opportunities:update'],
    });

    const card = within(column('Novo')).getByText('Cliente Alfa').closest('article') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Mover' }));
    await user.selectOptions(within(card).getByLabelText('Mover para'), 'st3');

    expect(within(card).getByLabelText(/justificativa/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Mover' })).toBeDisabled();
  });

  it('pipeline sem etapas mostra estado vazio', () => {
    renderWithProviders(<KanbanBoard pipeline={{ ...PIPELINE, stages: [] }} opportunities={[]} />);
    expect(screen.getByText(/ainda não tem etapas/i)).toBeInTheDocument();
  });
});
