import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { TimelineSection } from './TimelineSection';
import * as service from '../services/interactions';
import type { TimelineItem, TimelinePage } from '../types/interactions';

vi.mock('../services/interactions');

const INTERACTION: TimelineItem = {
  type: 'interaction',
  id: 'i1',
  occurred_at: '2026-10-05T14:30:00Z',
  author_id: 'u1',
  summary: 'Cliente ligou pedindo proposta',
  channel: 'telefone',
  direction: 'inbound',
  outcome: 'proposta enviada',
};
const NOTE: TimelineItem = {
  type: 'note',
  id: 'n1',
  occurred_at: '2026-10-04T10:00:00Z',
  author_id: 'u1',
  summary: 'Lembrar do desconto',
  channel: null,
  direction: null,
  outcome: null,
};

const page = (data: TimelineItem[], next: string | null = null): TimelinePage => ({
  data,
  next_cursor: next,
  has_more: next !== null,
});

function renderSection(permissions: string[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <TimelineSection entityType="customer" entityId="c1" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TimelineSection', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sem interactions:read nao renderiza nada nem consulta a API', () => {
    const { container } = renderSection(['notes:read', 'interactions:create']);
    expect(container).toBeEmptyDOMElement();
    expect(service.listTimeline).not.toHaveBeenCalled();
  });

  it('mostra estado vazio', async () => {
    vi.mocked(service.listTimeline).mockResolvedValue(page([]));
    renderSection(['interactions:read']);
    expect(await screen.findByText(/nenhum registro no historico/i)).toBeInTheDocument();
  });

  it('lista interacoes e notas na ordem recebida, com canal, direcao e resultado', async () => {
    vi.mocked(service.listTimeline).mockResolvedValue(page([INTERACTION, NOTE]));
    renderSection(['interactions:read']);

    expect(await screen.findByText('Cliente ligou pedindo proposta')).toBeInTheDocument();
    expect(screen.getByText('Lembrar do desconto')).toBeInTheDocument();
    expect(screen.getByText(/· telefone/)).toBeInTheDocument();
    expect(screen.getByText(/· Entrada/)).toBeInTheDocument();
    expect(screen.getByText(/resultado: proposta enviada/i)).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Cliente ligou pedindo proposta');
    expect(items[1]).toHaveTextContent('Lembrar do desconto');
    expect(service.listTimeline).toHaveBeenCalledWith('customer', 'c1', undefined);
  });

  it('carrega mais usando o cursor devolvido e anexa os itens; o botao some no fim', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listTimeline)
      .mockResolvedValueOnce(page([INTERACTION], 'cursor-1'))
      .mockResolvedValueOnce(page([NOTE]));
    renderSection(['interactions:read']);

    await user.click(await screen.findByRole('button', { name: /carregar mais/i }));

    expect(await screen.findByText('Lembrar do desconto')).toBeInTheDocument();
    expect(screen.getByText('Cliente ligou pedindo proposta')).toBeInTheDocument();
    expect(service.listTimeline).toHaveBeenLastCalledWith('customer', 'c1', 'cursor-1');
    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument();
  });

  it('RBAC visual: sem create/delete nao mostra registrar nem excluir', async () => {
    vi.mocked(service.listTimeline).mockResolvedValue(page([INTERACTION, NOTE]));
    renderSection(['interactions:read']);
    await screen.findByText('Cliente ligou pedindo proposta');
    expect(screen.queryByRole('button', { name: /registrar interacao/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir$/i })).not.toBeInTheDocument();
  });

  it('exclusao so aparece para interacoes (nunca para notas) e chama a API', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listTimeline).mockResolvedValue(page([INTERACTION, NOTE]));
    vi.mocked(service.deleteInteraction).mockResolvedValue(undefined);
    renderSection(['interactions:read', 'interactions:delete']);

    const buttons = await screen.findAllByRole('button', { name: /^excluir$/i });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    await waitFor(() => expect(service.deleteInteraction).toHaveBeenCalledWith('i1'));
  });

  it('registra uma interacao vinculada a entidade (sem edicao)', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listTimeline).mockResolvedValue(page([]));
    vi.mocked(service.createInteraction).mockResolvedValue({
      id: 'i9',
      entity_type: 'customer',
      entity_id: 'c1',
      author_id: 'u1',
      channel: 'e-mail',
      direction: 'outbound',
      summary: 'Enviei proposta',
      outcome: null,
      occurred_at: '2026-10-06T10:00:00Z',
      created_at: '2026-10-06T10:00:00Z',
    });
    renderSection(['interactions:read', 'interactions:create']);

    await user.click(await screen.findByRole('button', { name: /registrar interacao/i }));
    await user.type(screen.getByLabelText(/^canal/i), 'e-mail');
    await user.selectOptions(screen.getByLabelText(/direcao/i), 'outbound');
    await user.type(screen.getByLabelText(/^resumo/i), 'Enviei proposta');
    await user.click(screen.getByRole('button', { name: /^registrar$/i }));

    await waitFor(() => expect(service.createInteraction).toHaveBeenCalledTimes(1));
    expect(service.createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'customer',
        entity_id: 'c1',
        channel: 'e-mail',
        direction: 'outbound',
        summary: 'Enviei proposta',
        occurred_at: expect.any(String),
      }),
    );
    expect(vi.mocked(service.createInteraction).mock.calls[0][0]).not.toHaveProperty('outcome');
  });

  it('sem direcao selecionada, direction nao e enviado', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listTimeline).mockResolvedValue(page([]));
    vi.mocked(service.createInteraction).mockResolvedValue({} as never);
    renderSection(['interactions:read', 'interactions:create']);

    await user.click(await screen.findByRole('button', { name: /registrar interacao/i }));
    await user.type(screen.getByLabelText(/^canal/i), 'presencial');
    await user.type(screen.getByLabelText(/^resumo/i), 'Visita');
    await user.click(screen.getByRole('button', { name: /^registrar$/i }));

    await waitFor(() => expect(service.createInteraction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(service.createInteraction).mock.calls[0][0]).not.toHaveProperty('direction');
  });

  it('mostra erro de carregamento com opcao de tentar novamente', async () => {
    const user = userEvent.setup();
    vi.mocked(service.listTimeline)
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce(page([INTERACTION]));
    renderSection(['interactions:read']);

    expect(await screen.findByText(/nao foi possivel carregar o historico/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Cliente ligou pedindo proposta')).toBeInTheDocument();
  });
});
