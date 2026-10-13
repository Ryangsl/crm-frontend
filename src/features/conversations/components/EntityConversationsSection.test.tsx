import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { EntityConversationsSection } from './EntityConversationsSection';
import * as service from '../services/conversations';
import { CONVERSATION, renderWithProviders } from '../testing';

vi.mock('../services/conversations');

const page = (data = [CONVERSATION]) => ({ data, page: 1, limit: 20, total: data.length });

describe('EntityConversationsSection', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem conversations:read nao renderiza nada nem consulta a API', () => {
    const { container } = renderWithProviders(
      <EntityConversationsSection entityType="lead" entityId="lead-1" />,
      ['conversations:create'],
    );
    expect(container).toBeEmptyDOMElement();
    expect(service.listConversations).not.toHaveBeenCalled();
  });

  it.each([
    ['customer', 'customer_id'],
    ['lead', 'lead_id'],
    ['opportunity', 'opportunity_id'],
  ] as const)('%s: filtra pelo vinculo dedicado %s', async (entityType, key) => {
    vi.mocked(service.listConversations).mockResolvedValue(page());
    renderWithProviders(<EntityConversationsSection entityType={entityType} entityId="e1" />, [
      'conversations:read',
    ]);
    expect(await screen.findByText(/ultima mensagem em/i)).toBeInTheDocument();
    expect(service.listConversations).toHaveBeenCalledWith({ limit: 20, [key]: 'e1' });
  });

  it('estado vazio e sem botao de abrir quando falta conversations:create', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([]));
    renderWithProviders(<EntityConversationsSection entityType="lead" entityId="lead-1" />, [
      'conversations:read',
    ]);
    expect(await screen.findByText('Nenhuma conversa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir conversa/i })).not.toBeInTheDocument();
  });

  it('abre conversa com o vinculo certo e navega para ela', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([]));
    vi.mocked(service.createConversation).mockResolvedValue({ ...CONVERSATION, id: 'nova' });
    const user = userEvent.setup();
    renderWithProviders(<EntityConversationsSection entityType="lead" entityId="lead-1" />, [
      'conversations:read',
      'conversations:create',
    ]);

    await user.click(await screen.findByRole('button', { name: /abrir conversa/i }));

    await waitFor(() =>
      expect(service.createConversation).toHaveBeenCalledWith({ lead_id: 'lead-1' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/conversations/nova'),
    );
  });

  it('erro ao abrir mostra mensagem e nao navega', async () => {
    vi.mocked(service.listConversations).mockResolvedValue(page([]));
    vi.mocked(service.createConversation).mockRejectedValue(
      new ApiError(422, 'CONVERSATION_REFERENCE_MISMATCH', 'x'),
    );
    const user = userEvent.setup();
    renderWithProviders(<EntityConversationsSection entityType="customer" entityId="c1" />, [
      'conversations:read',
      'conversations:create',
    ]);

    await user.click(await screen.findByRole('button', { name: /abrir conversa/i }));

    expect(await screen.findByText(/vinculos informados nao sao coerentes/i)).toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });
});
