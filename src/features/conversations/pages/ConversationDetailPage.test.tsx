import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { ConversationDetailPage } from './ConversationDetailPage';
import * as service from '../services/conversations';
import { CONVERSATION, message, renderWithProviders } from '../testing';
import type { Conversation } from '../types/conversations';

vi.mock('../services/conversations');

const READ = ['conversations:read'];
const AGENT = [...READ, 'conversations:update'];
const MANAGER = [...AGENT, 'conversations:assign', 'users:read'];

function renderDetail(permissions: string[], conversation: Conversation = CONVERSATION) {
  vi.mocked(service.getConversation).mockResolvedValue(conversation);
  vi.mocked(service.listAssignees).mockResolvedValue({
    data: [
      { id: 'u-agent', name: 'Beto Atendente', status: 'active' },
      { id: 'u-off', name: 'Inativo', status: 'inactive' },
    ],
  });
  return renderWithProviders(<ConversationDetailPage />, permissions, {
    route: '/conversations/conv-1',
    path: '/conversations/:id',
  });
}

const messagesPage = (
  data = [message('m2', '2026-10-07T11:00:00Z'), message('m1', '2026-10-07T10:00:00Z')],
  next: string | null = null,
) => ({
  data,
  next_cursor: next,
});

describe('ConversationDetailPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem conversations:read mostra aviso e nao consulta a API', () => {
    renderWithProviders(<ConversationDetailPage />, ['leads:read'], {
      route: '/conversations/conv-1',
      path: '/conversations/:id',
    });
    expect(screen.getByText(/nao tem permissao para ver conversas/i)).toBeInTheDocument();
    expect(service.getConversation).not.toHaveBeenCalled();
    expect(service.listMessages).not.toHaveBeenCalled();
  });

  it('contexto ocultado pelo backend (sem leitura dos recursos): a conversa abre com rotulos genericos', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    renderDetail(READ, {
      ...CONVERSATION,
      lead_id: 'lead-1',
      opportunity_id: 'opp-1',
      context: {
        customer_name: null,
        lead_name: null,
        lead_status: null,
        opportunity_status: null,
      },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Oportunidade' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cliente' })).toHaveAttribute(
      'href',
      '/customers/cust-1',
    );
    expect(screen.getByRole('link', { name: 'Ver lead' })).toHaveAttribute('href', '/leads/lead-1');
    expect(screen.getByRole('link', { name: 'Ver oportunidade' })).toHaveAttribute(
      'href',
      '/opportunities/opp-1',
    );
    expect(screen.queryByText('Ana Cliente')).not.toBeInTheDocument();
  });

  it('conversa inexistente (404): mostra "nao encontrada"', async () => {
    vi.mocked(service.getConversation).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    renderWithProviders(<ConversationDetailPage />, READ, {
      route: '/conversations/conv-1',
      path: '/conversations/:id',
    });
    expect(await screen.findByText('Conversa nao encontrada')).toBeInTheDocument();
  });

  it('mostra o contexto CRM com links para a entidade, o estado e o canal neutro', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    renderDetail(READ, {
      ...CONVERSATION,
      lead_id: 'lead-1',
      opportunity_id: 'opp-1',
      context: { ...CONVERSATION.context, lead_name: 'Lia Lead', opportunity_status: 'open' },
    });
    expect(await screen.findByRole('link', { name: 'Ana Cliente' })).toHaveAttribute(
      'href',
      '/customers/cust-1',
    );
    expect(screen.getByRole('link', { name: 'Lia Lead' })).toHaveAttribute('href', '/leads/lead-1');
    expect(screen.getByRole('link', { name: /ver oportunidade/i })).toHaveAttribute(
      'href',
      '/opportunities/opp-1',
    );
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText(/canal: manual/i)).toBeInTheDocument();
  });

  it('exibe as mensagens em ordem cronologica (a API entrega da mais recente para a mais antiga)', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(
      messagesPage([
        message('m3', '2026-10-07T12:00:00Z', { direction: 'outbound', sender_user_id: 'u-me' }),
        message('m2', '2026-10-07T11:00:00Z', { direction: 'inbound' }),
        message('m1', '2026-10-07T10:00:00Z'),
      ]),
    );
    renderDetail(READ);
    await screen.findByText('texto m3');
    const items = within(
      screen.getByRole('heading', { name: 'Mensagens' }).closest('section') as HTMLElement,
    ).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('texto m1'),
      expect.stringContaining('texto m2'),
      expect.stringContaining('texto m3'),
    ]);
    expect(items[0]).toHaveTextContent('Interna');
    expect(items[1]).toHaveTextContent('Entrada');
    expect(items[2]).toHaveTextContent('Saida');
    expect(items[2]).toHaveTextContent('Voce');
  });

  it('"Carregar anteriores" busca a pagina seguinte pelo cursor e a coloca no inicio', async () => {
    vi.mocked(service.listMessages)
      .mockResolvedValueOnce(messagesPage([message('m2', '2026-10-07T11:00:00Z')], 'cursor-1'))
      .mockResolvedValueOnce(messagesPage([message('m1', '2026-10-07T10:00:00Z')]));
    const user = userEvent.setup();
    renderDetail(READ);

    await user.click(await screen.findByRole('button', { name: /carregar anteriores/i }));

    await screen.findByText('texto m1');
    expect(service.listMessages).toHaveBeenLastCalledWith('conv-1', 'cursor-1');
    const items = within(
      screen.getByRole('heading', { name: 'Mensagens' }).closest('section') as HTMLElement,
    ).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('texto m1');
    expect(screen.queryByRole('button', { name: /carregar anteriores/i })).not.toBeInTheDocument();
  });

  it('sem conversations:update: nao ha composer nem encerrar/reabrir', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage());
    renderDetail(READ);
    await screen.findByText('texto m2');
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /encerrar conversa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reabrir conversa/i })).not.toBeInTheDocument();
  });

  it('registra mensagem com direcao opcional e limpa o campo', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.createMessage).mockResolvedValue(message('m9', '2026-10-07T13:00:00Z'));
    const user = userEvent.setup();
    renderDetail(AGENT);

    await user.type(await screen.findByLabelText('Mensagem'), 'Cliente pediu retorno');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'inbound');
    await user.click(screen.getByRole('button', { name: /registrar mensagem/i }));

    await waitFor(() =>
      expect(service.createMessage).toHaveBeenCalledWith('conv-1', {
        content: 'Cliente pediu retorno',
        direction: 'inbound',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Mensagem')).toHaveValue(''));
  });

  it('mensagem sem tipo e anotacao interna (sem direction no payload)', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.createMessage).mockResolvedValue(message('m9', '2026-10-07T13:00:00Z'));
    const user = userEvent.setup();
    renderDetail(AGENT);

    await user.type(await screen.findByLabelText('Mensagem'), 'nota');
    await user.click(screen.getByRole('button', { name: /registrar mensagem/i }));

    await waitFor(() =>
      expect(service.createMessage).toHaveBeenCalledWith('conv-1', { content: 'nota' }),
    );
  });

  it('erro 409 CONVERSATION_CLOSED ao registrar mostra a explicacao', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.createMessage).mockRejectedValue(
      new ApiError(409, 'CONVERSATION_CLOSED', 'x'),
    );
    const user = userEvent.setup();
    renderDetail(AGENT);

    await user.type(await screen.findByLabelText('Mensagem'), 'oi');
    await user.click(screen.getByRole('button', { name: /registrar mensagem/i }));

    expect(
      await screen.findByText(/conversa esta encerrada\. reabra-a para continuar/i),
    ).toBeInTheDocument();
  });

  it('encerra a conversa aberta', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.closeConversation).mockResolvedValue({ ...CONVERSATION, status: 'closed' });
    const user = userEvent.setup();
    renderDetail(AGENT);

    await user.click(await screen.findByRole('button', { name: /encerrar conversa/i }));

    await waitFor(() => expect(service.closeConversation).toHaveBeenCalledWith('conv-1'));
  });

  it('conversa encerrada: sem composer, com aviso, e "Reabrir" chama a API', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.reopenConversation).mockResolvedValue(CONVERSATION);
    const user = userEvent.setup();
    renderDetail(AGENT, { ...CONVERSATION, status: 'closed', closed_at: '2026-10-07T13:00:00Z' });

    expect(await screen.findByText(/conversa encerrada\. reabra-a/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /encerrar conversa/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reabrir conversa/i }));
    await waitFor(() => expect(service.reopenConversation).toHaveBeenCalledWith('conv-1'));
  });

  it('atribuicao so aparece com conversations:assign; lista apenas usuarios ativos', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    renderDetail(AGENT);
    await screen.findByText('Sem responsavel', { selector: 'p' });
    expect(screen.queryByLabelText('Atribuir a')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /atribuir a mim/i })).not.toBeInTheDocument();
  });

  it('atribui a um usuario escolhido, a mim e remove o responsavel', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.assignConversation).mockResolvedValue(CONVERSATION);
    const user = userEvent.setup();
    renderDetail(MANAGER, { ...CONVERSATION, assigned_to: 'u-agent' });

    const select = await screen.findByLabelText('Atribuir a');
    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['Selecione...', 'Beto Atendente']); // inativo fica de fora
    await waitFor(() =>
      expect(screen.getByText('Beto Atendente', { selector: 'p' })).toBeInTheDocument(),
    );

    await user.selectOptions(select, 'u-agent');
    await user.click(screen.getByRole('button', { name: 'Atribuir' }));
    await waitFor(() =>
      expect(service.assignConversation).toHaveBeenLastCalledWith('conv-1', 'u-agent'),
    );

    await user.click(screen.getByRole('button', { name: /atribuir a mim/i }));
    await waitFor(() =>
      expect(service.assignConversation).toHaveBeenLastCalledWith('conv-1', 'u-me'),
    );

    await user.click(screen.getByRole('button', { name: /remover responsavel/i }));
    await waitFor(() =>
      expect(service.assignConversation).toHaveBeenLastCalledWith('conv-1', null),
    );
  });

  it('erro 422 de responsavel inelegivel e explicado', async () => {
    vi.mocked(service.listMessages).mockResolvedValue(messagesPage([]));
    vi.mocked(service.assignConversation).mockRejectedValue(
      new ApiError(422, 'CONVERSATION_ASSIGNEE_INELIGIBLE', 'x'),
    );
    const user = userEvent.setup();
    renderDetail(MANAGER);

    await user.click(await screen.findByRole('button', { name: /atribuir a mim/i }));

    expect(await screen.findByText(/nao pode receber conversas/i)).toBeInTheDocument();
  });
});
