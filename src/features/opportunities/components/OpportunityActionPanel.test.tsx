import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { OpportunityActionPanel } from './OpportunityActionPanel';
import type { ActionMode } from './OpportunityActionPanel';
import * as service from '../services/opportunities';
import { makeOpportunity, renderWithProviders, STAGES } from '../test-utils';
import type { Opportunity } from '../types/opportunity';

vi.mock('../services/opportunities');

function renderPanel(mode: ActionMode, opportunity: Opportunity = makeOpportunity()) {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(
    <OpportunityActionPanel
      opportunity={opportunity}
      stages={STAGES}
      mode={mode}
      onDone={onDone}
      onCancel={onCancel}
    />,
  );
  return { onDone, onCancel };
}

describe('OpportunityActionPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mover: lista só etapas não terminais e diferentes da atual', () => {
    renderPanel('move');
    const options = within(screen.getByLabelText('Mover para'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['Selecione a etapa', 'Negociação', 'Proposta']);
  });

  it('movimento adjacente não pede justificativa e chama a API', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity).mockResolvedValue(makeOpportunity({ stage_id: 'st2' }));
    const { onDone } = renderPanel('move', makeOpportunity({ value: '10.00' }));

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st2');
    expect(screen.queryByLabelText(/justificativa/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.moveOpportunity).toHaveBeenCalledWith('o1', {
      stage_id: 'st2',
      justification: undefined,
    });
  });

  it('salto de etapa exige justificativa antes de habilitar o envio', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity).mockResolvedValue(makeOpportunity({ stage_id: 'st3' }));
    renderPanel('move');

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st3'); // Novo(1) -> Proposta(3)
    expect(screen.getByLabelText(/justificativa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover' })).toBeDisabled();

    await user.type(screen.getByLabelText(/justificativa/i), 'Cliente já aprovou');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() =>
      expect(service.moveOpportunity).toHaveBeenCalledWith('o1', {
        stage_id: 'st3',
        justification: 'Cliente já aprovou',
      }),
    );
  });

  it('D-034: destino que exige valor e oportunidade sem valor — pede o valor e salva antes de mover', async () => {
    const user = userEvent.setup();
    vi.mocked(service.updateOpportunity).mockResolvedValue(makeOpportunity({ value: '1500.50' }));
    vi.mocked(service.moveOpportunity).mockResolvedValue(makeOpportunity({ stage_id: 'st2' }));
    renderPanel('move');

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st2');
    expect(screen.getByRole('button', { name: 'Mover' })).toBeDisabled(); // falta o valor.

    await user.type(screen.getByLabelText(/valor da oportunidade/i), '1.500,50');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() => expect(service.moveOpportunity).toHaveBeenCalled());
    expect(service.updateOpportunity).toHaveBeenCalledWith('o1', { value: '1500.50' });
    expect(vi.mocked(service.updateOpportunity).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(service.moveOpportunity).mock.invocationCallOrder[0],
    );
  });

  it('D-034: destino que NÃO exige valor não pede valor (regra não se propaga por ordem)', async () => {
    const user = userEvent.setup();
    renderPanel('move', makeOpportunity({ stage_id: 'st2', value: null }));

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st3'); // Proposta (não exige)
    expect(screen.queryByLabelText(/valor da oportunidade/i)).not.toBeInTheDocument();
  });

  it('se o backend exigir justificativa, o painel pede e permite reenviar', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity)
      .mockRejectedValueOnce(
        new ApiError(422, 'OPPORTUNITY_JUSTIFICATION_REQUIRED', 'Justificativa obrigatoria.'),
      )
      .mockResolvedValueOnce(makeOpportunity({ stage_id: 'st2' }));
    const { onDone } = renderPanel('move', makeOpportunity({ value: '10.00' }));

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st2');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    expect(
      await screen.findByText(/informe uma justificativa e envie novamente/i),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/justificativa/i), 'Combinado com o gerente');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.moveOpportunity).toHaveBeenLastCalledWith('o1', {
      stage_id: 'st2',
      justification: 'Combinado com o gerente',
    });
  });

  it('se o backend exigir valor, o painel pede o valor e reenvia', async () => {
    const user = userEvent.setup();
    // Frontend acreditava que não precisava (oportunidade já tinha valor no cache), backend recusa.
    vi.mocked(service.moveOpportunity)
      .mockRejectedValueOnce(new ApiError(422, 'OPPORTUNITY_VALUE_REQUIRED', 'Valor obrigatorio.'))
      .mockResolvedValueOnce(makeOpportunity({ stage_id: 'st3' }));
    vi.mocked(service.updateOpportunity).mockResolvedValue(makeOpportunity({ value: '20.00' }));
    const { onDone } = renderPanel('move', makeOpportunity({ stage_id: 'st2', value: '5.00' }));

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st3');
    await user.click(screen.getByRole('button', { name: 'Mover' }));
    expect(
      await screen.findByText(/informe o valor da oportunidade e envie novamente/i),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/valor da oportunidade/i), '20');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateOpportunity).toHaveBeenCalledWith('o1', { value: '20' });
  });

  it('ganhar: mostra a etapa de ganho (por flag) e chama win; sem valor, pede o valor antes', async () => {
    const user = userEvent.setup();
    vi.mocked(service.updateOpportunity).mockResolvedValue(makeOpportunity({ value: '99.00' }));
    vi.mocked(service.winOpportunity).mockResolvedValue(
      makeOpportunity({ status: 'won', stage_id: 'st4' }),
    );
    const { onDone } = renderPanel('win');

    expect(screen.getByText(/etapa de ganho do pipeline \(Ganho\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar ganho' })).toBeDisabled();

    await user.type(screen.getByLabelText(/valor da oportunidade/i), '99');
    await user.click(screen.getByRole('button', { name: 'Confirmar ganho' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateOpportunity).toHaveBeenCalledWith('o1', { value: '99' });
    expect(service.winOpportunity).toHaveBeenCalledWith('o1');
  });

  it('perder: motivo obrigatório (mínimo 3 caracteres) e chama lose', async () => {
    const user = userEvent.setup();
    vi.mocked(service.loseOpportunity).mockResolvedValue(
      makeOpportunity({ status: 'lost', stage_id: 'st5' }),
    );
    const { onDone } = renderPanel('lose');

    const confirm = screen.getByRole('button', { name: 'Confirmar perda' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/motivo da perda/i), 'ab');
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/motivo da perda/i), 'c');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.loseOpportunity).toHaveBeenCalledWith('o1', 'abc');
  });

  it('mostra erro do backend (ex.: oportunidade já encerrada) e não fecha o painel', async () => {
    const user = userEvent.setup();
    vi.mocked(service.moveOpportunity).mockRejectedValue(
      new ApiError(409, 'OPPORTUNITY_TERMINAL', 'A oportunidade ja esta encerrada.'),
    );
    const { onDone } = renderPanel('move', makeOpportunity({ value: '10.00' }));

    await user.selectOptions(screen.getByLabelText('Mover para'), 'st2');
    await user.click(screen.getByRole('button', { name: 'Mover' }));

    expect(await screen.findByText(/ja esta encerrada/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
