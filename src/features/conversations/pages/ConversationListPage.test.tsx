import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConversationListPage } from './ConversationListPage';
import * as service from '../services/conversations';
import { CONVERSATION, renderWithProviders } from '../testing';
import type { Conversation } from '../types/conversations';

vi.mock('../services/conversations');

const closedLead: Conversation = {
  ...CONVERSATION,
  id: 'conv-2',
  status: 'closed',
  customer_id: null,
  lead_id: 'lead-1',
  context: { ...CONVERSATION.context, customer_name: null, lead_name: 'Lia Lead' },
  assigned_to: 'u-9',
  last_message_at: null,
};

const page = (data: Conversation[], total = data.length) => ({ data, page: 1, limit: 20, total });

describe('ConversationListPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem conversations:read mostra aviso e nao consulta a API', () => {
    renderWithProviders(<ConversationListPage />, ['leads:read']);
    expect(screen.getByText(/nao tem permissao para ver conversas/i)).toBeInTheDocument();
    expect(service.listConversations).not.toHaveBeenCalled();
  });

  it('lista as conversas com titulo do contexto, estado e responsavel; link para o detalhe', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([CONVERSATION, closedLead]));
    renderWithProviders(<ConversationListPage />, ['conversations:read']);

    expect(await screen.findByText('Ana Cliente')).toBeInTheDocument();
    expect(screen.getByText('Lia Lead')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.getByText(/sem responsavel/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/com responsavel/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ana cliente/i })).toHaveAttribute(
      'href',
      '/conversations/conv-1',
    );
    expect(service.listConversations).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
      unassigned: undefined,
    });
  });

  it('estado vazio', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([]));
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    expect(await screen.findByText(/nenhuma conversa encontrada/i)).toBeInTheDocument();
  });

  it('filtros de estado e "sem responsavel" reconsultam a API e voltam para a pagina 1', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([CONVERSATION]));
    const user = userEvent.setup();
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    await screen.findByText('Ana Cliente');

    await user.selectOptions(screen.getByLabelText('Estado'), 'closed');
    await waitFor(() =>
      expect(service.listConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'closed', page: 1 }),
      ),
    );
    await user.selectOptions(screen.getByLabelText('Responsavel'), 'unassigned');
    await waitFor(() =>
      expect(service.listConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'closed', unassigned: true }),
      ),
    );
  });

  it('pagina: Proxima e Anterior', async () => {
    vi.mocked(service.listConversations).mockImplementation(async (params) => ({
      data: [CONVERSATION],
      page: params?.page ?? 1,
      limit: 20,
      total: 45,
    }));
    const user = userEvent.setup();
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    expect(await screen.findByText(/pagina 1 de 3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Proxima' }));
    expect(await screen.findByText(/pagina 2 de 3/i)).toBeInTheDocument();
    expect(service.listConversations).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('erro de carregamento permite tentar novamente', async () => {
    vi.mocked(service.listConversations)
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce(page([CONVERSATION]));
    const user = userEvent.setup();
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    expect(await screen.findByText(/nao foi possivel carregar as conversas/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Ana Cliente')).toBeInTheDocument();
  });
});
