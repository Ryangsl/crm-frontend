import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StageHistorySection } from './StageHistorySection';
import * as service from '../services/opportunities';
import { renderWithProviders } from '../test-utils';
import type { StageHistoryItem } from '../types/opportunity';

vi.mock('../services/opportunities');

function item(id: string, extra: Partial<StageHistoryItem> = {}): StageHistoryItem {
  return {
    id,
    from_stage: { id: 'st1', name: 'Novo' },
    to_stage: { id: 'st2', name: 'Negociação' },
    changed_by: { id: 'u1', name: 'Ana' },
    changed_at: '2026-11-10T13:00:00Z',
    justification: null,
    ...extra,
  };
}

describe('StageHistorySection (RF-10)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega mais com o cursor devolvido pela API', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listStageHistory)
      .mockResolvedValueOnce({ data: [item('h3')], next_cursor: 'abc_DEF-1' })
      .mockResolvedValueOnce({
        data: [item('h1', { from_stage: null, to_stage: { id: 'st1', name: 'Novo' } })],
        next_cursor: null,
      });
    renderWithProviders(<StageHistorySection opportunityId="o1" />);

    expect(await screen.findByText('Novo → Negociação')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByText('Criada em Novo')).toBeInTheDocument();
    expect(service.listStageHistory).toHaveBeenLastCalledWith('o1', 'abc_DEF-1');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument(),
    );
  });

  it('vazio e erro', async () => {
    vi.mocked(service.listStageHistory).mockResolvedValueOnce({ data: [], next_cursor: null });
    const { unmount } = renderWithProviders(<StageHistorySection opportunityId="o1" />);
    expect(await screen.findByText('Nenhuma mudança de etapa registrada')).toBeInTheDocument();
    unmount();

    vi.mocked(service.listStageHistory).mockRejectedValueOnce(new Error('rede'));
    renderWithProviders(<StageHistorySection opportunityId="o2" />);
    expect(
      await screen.findByText('Não foi possível carregar o histórico de etapas'),
    ).toBeInTheDocument();
  });
});
