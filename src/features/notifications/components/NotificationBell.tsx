import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '../hooks/useNotifications';
import type { AppNotification } from '../types/notifications';

interface NotificationBellProps {
  // Lado em que o painel abre, para nao estourar a viewport (sidebar a esquerda, header a direita).
  align?: 'left' | 'right';
  className?: string;
}

const MAX_BADGE = 99;

function describe(notification: AppNotification): string {
  if (notification.type === 'lead.assigned') {
    const name = notification.payload.lead_name;
    return typeof name === 'string' && name.trim()
      ? `Lead atribuido a voce: ${name}`
      : 'Um lead sem nome foi atribuido a voce';
  }
  return 'Nova notificacao';
}

// Destino ao abrir a notificacao: hoje so Lead (unico tipo da v1).
function destination(notification: AppNotification): string | null {
  if (notification.entity_type === 'lead' && notification.entity_id) {
    return `/leads/${notification.entity_id}`;
  }
  return null;
}

// F4.5 v1: sino com contador de nao lidas (polling 30 s) e painel. Sem pagina propria, sem
// toast e sem permissao: toda pessoa autenticada ve apenas as proprias notificacoes.
export function NotificationBell({ align = 'right', className = '' }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unread = 0 } = useUnreadCountQuery(true);
  const list = useNotificationsQuery(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointer);
    };
  }, [open]);

  const items = list.data?.pages.flatMap((page) => page.data) ?? [];

  async function handleOpen(notification: AppNotification) {
    const to = destination(notification);
    if (!notification.read_at) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Falha ao marcar nao impede a navegacao; o proximo polling reconcilia o estado.
      }
    }
    if (to) {
      setOpen(false);
      navigate(to);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notificacoes (${unread} nao lidas)` : 'Notificacoes'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="min-h-touch hover:bg-surface-muted relative flex min-w-touch items-center justify-center rounded-lg px-2 text-neutral-700"
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            className="bg-danger absolute right-0 top-1 min-w-5 rounded-full px-1 text-center text-xs font-semibold text-white"
          >
            {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificacoes"
          className={`border-border-subtle bg-surface absolute top-full z-20 mt-2 flex max-h-96 w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 overflow-y-auto rounded-xl border p-3 shadow-lg ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">Notificacoes</h2>
            <Button
              size="sm"
              variant="ghost"
              disabled={unread === 0 || markAll.isPending}
              loading={markAll.isPending}
              onClick={() => void markAll.mutateAsync().catch(() => undefined)}
            >
              Marcar todas como lidas
            </Button>
          </div>

          {list.isPending && (
            <p className="flex items-center gap-2 text-sm text-neutral-600">
              <Spinner size="sm" /> Carregando...
            </p>
          )}

          {list.isError && (
            <Alert tone="danger" title="Nao foi possivel carregar as notificacoes">
              <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
                Tentar novamente
              </Button>
            </Alert>
          )}

          {!list.isPending && !list.isError && items.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-500">Nenhuma notificacao.</p>
          )}

          {items.length > 0 && (
            <ul className="flex flex-col gap-1">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleOpen(notification)}
                    className={`hover:bg-surface-muted w-full rounded-lg border p-2 text-left ${
                      notification.read_at
                        ? 'border-border-subtle text-neutral-600'
                        : 'border-brand-200 bg-brand-50 font-medium text-neutral-900'
                    }`}
                  >
                    <span className="block text-sm">{describe(notification)}</span>
                    <span className="block text-xs text-neutral-500">
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {list.hasNextPage && (
            <Button
              size="sm"
              variant="secondary"
              loading={list.isFetchingNextPage}
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              Carregar mais
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
