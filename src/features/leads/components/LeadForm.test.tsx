import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { LeadForm } from './LeadForm';
import * as leadsService from '../services/leads';
import type { Lead, LeadSourceListResponse } from '../types/lead';

vi.mock('../services/leads');

function renderForm(props: Partial<ComponentProps<typeof LeadForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LeadForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

function sourcesPage(): LeadSourceListResponse {
  return {
    data: [
      { id: 's1', name: 'Site', created_at: '', updated_at: '' },
      { id: 's2', name: 'Indicação', created_at: '', updated_at: '' },
    ],
    page: 1,
    limit: 100,
    total: 2,
  };
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

describe('LeadForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cria um lead selecionando a origem e chama onSuccess', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.createLead).mockResolvedValue(LEAD);
    const { onSuccess } = renderForm();

    await user.selectOptions(await screen.findByLabelText(/origem/i), 's1');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(LEAD));
    expect(leadsService.createLead).toHaveBeenCalledWith({ source_id: 's1' });
  });

  it('nao permite submeter sem selecionar origem', async () => {
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderForm();

    expect(await screen.findByRole('button', { name: /criar lead/i })).toBeDisabled();
  });

  it('em modo edicao, pre-preenche a origem atual e chama updateLead', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.updateLead).mockResolvedValue({ ...LEAD, source_id: 's2' });
    const { onSuccess } = renderForm({ lead: LEAD });

    const select = await screen.findByLabelText(/origem/i);
    expect(select).toHaveValue('s1');

    await user.selectOptions(select, 's2');
    await user.click(screen.getByRole('button', { name: /salvar alteracoes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(leadsService.updateLead).toHaveBeenCalledWith('l1', { source_id: 's2' });
  });

  it('em 403, mostra mensagem de permissao', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.createLead).mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Sem permissao.'));
    renderForm();

    await user.selectOptions(await screen.findByLabelText(/origem/i), 's1');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));

    expect(await screen.findByText(/voce nao tem permissao/i)).toBeInTheDocument();
  });
});
