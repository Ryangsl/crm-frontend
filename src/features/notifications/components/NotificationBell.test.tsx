import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from './NotificationBell';
import * as service from '../services/notifications';
import type { AppNotification, NotificationPage } from '../types/notifications';

vi.mock('../services/notifications');

const UNREAD: AppNotification = {
  id: 'n1',
  type: 'lead.assigned',
  entity_type: 'lead',
  entity_id: 'lead-1',
  payload: { lead_name: 'Maria Souza' },
  read_at: null,
  created_at: '2026-10-07T12:00:00Z',
};
const READ: AppNotification = {
  id: 'n2',
  type: 'lead.assigned',
  entity_type: 'lead',
  entity_id: 'lead-2',
  payload: { lead_name: null },
  read_at: '2026-10-07T12:30:00Z',
  created_at: '2026-10-07T11:00:00Z',
};

const page = (data: AppNotification[], next: string | null = null): NotificationPage => ({
  data,
  next_cursor: next,
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <NotificationBell />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('sem nao lidas: sem contador; com nao lidas: mostra o numero', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    const { unmount } = renderBell();
    await waitFor(() => expect(service.getUnreadCount).toHaveBeenCalled());
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    unmount();

    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 3 });
    renderBell();
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('3');
    expect(
      screen.getByRole('button', { name: /notificacoes \(3 nao lidas\)/i }),
    ).toBeInTheDocument();
  });

  it('contador grande e limitado a 99+', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 250 });
    renderBell();
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('a lista so e carregada quando o painel e aberto', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 1 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([UNREAD]));
    const user = userEvent.setup();
    renderBell();
    await screen.findByTestId('notification-badge');
    expect(service.listNotifications).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    expect(await screen.findByText('Lead atribuido a voce: Maria Souza')).toBeInTheDocument();
    expect(service.listNotifications).toHaveBeenCalledWith(undefined);
  });

  it('lista lidas e nao lidas; lead sem nome usa texto proprio; estado vazio', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 1 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([UNREAD, READ]));
    const user = userEvent.setup();
    const { unmount } = renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(await screen.findByText('Lead atribuido a voce: Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Um lead sem nome foi atribuido a voce')).toBeInTheDocument();
    unmount();

    vi.mocked(service.listNotifications).mockResolvedValue(page([]));
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(await screen.findByText(/nenhuma notificacao\./i)).toBeInTheDocument();
  });

  it('abrir uma notificacao nao lida a marca como lida e navega para o Lead', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 1 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([UNREAD]));
    vi.mocked(service.markNotificationRead).mockResolvedValue({ ...UNREAD, read_at: 'x' });
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    await user.click(await screen.findByText('Lead atribuido a voce: Maria Souza'));

    await waitFor(() => expect(service.markNotificationRead).toHaveBeenCalledWith('n1'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/leads/lead-1'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // painel fecha ao navegar
  });

  it('abrir uma notificacao ja lida navega sem chamar a API de leitura', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([READ]));
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    await user.click(await screen.findByText('Um lead sem nome foi atribuido a voce'));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/leads/lead-2'));
    expect(service.markNotificationRead).not.toHaveBeenCalled();
  });

  it('marcar como lida atualiza o contador (refaz a consulta)', async () => {
    vi.mocked(service.getUnreadCount)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([UNREAD]));
    vi.mocked(service.markNotificationRead).mockResolvedValue({ ...UNREAD, read_at: 'x' });
    const user = userEvent.setup();
    renderBell();
    await screen.findByTestId('notification-badge');
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    await user.click(await screen.findByText('Lead atribuido a voce: Maria Souza'));

    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument());
  });

  it('"Marcar todas como lidas" chama a API; desabilitado sem nao lidas', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 2 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([UNREAD, READ]));
    vi.mocked(service.markAllNotificationsRead).mockResolvedValue({ updated: 2 });
    const user = userEvent.setup();
    renderBell();
    await screen.findByTestId('notification-badge');
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    await user.click(await screen.findByRole('button', { name: /marcar todas como lidas/i }));
    await waitFor(() => expect(service.markAllNotificationsRead).toHaveBeenCalledTimes(1));
  });

  it('"Marcar todas" fica desabilitado quando nao ha nao lidas', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([READ]));
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(await screen.findByRole('button', { name: /marcar todas como lidas/i })).toBeDisabled();
  });

  it('carregar mais usa o cursor devolvido e anexa os itens', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications)
      .mockResolvedValueOnce(page([UNREAD], 'cursor-1'))
      .mockResolvedValueOnce(page([READ]));
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    await user.click(await screen.findByRole('button', { name: /carregar mais/i }));

    expect(await screen.findByText('Um lead sem nome foi atribuido a voce')).toBeInTheDocument();
    expect(service.listNotifications).toHaveBeenLastCalledWith('cursor-1');
    expect(screen.queryByRole('button', { name: /carregar mais/i })).not.toBeInTheDocument();
  });

  it('erro ao carregar a lista permite tentar novamente', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications)
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce(page([UNREAD]));
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    expect(
      await screen.findByText(/nao foi possivel carregar as notificacoes/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Lead atribuido a voce: Maria Souza')).toBeInTheDocument();
  });

  it('Escape fecha o painel', async () => {
    vi.mocked(service.getUnreadCount).mockResolvedValue({ count: 0 });
    vi.mocked(service.listNotifications).mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('polling: reconsulta o contador a cada 30 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(service.getUnreadCount)
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 4 });
    renderBell();
    await waitFor(() => expect(service.getUnreadCount).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000);
    });
    expect(service.getUnreadCount).toHaveBeenCalledTimes(1); // ainda nao deu 30 s

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    await waitFor(() => expect(service.getUnreadCount).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('4');
  });
});
