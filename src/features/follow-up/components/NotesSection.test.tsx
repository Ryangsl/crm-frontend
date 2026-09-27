import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { NotesSection } from './NotesSection';
import * as followUpService from '../services/followUp';
import type { Note } from '../types/followUp';

vi.mock('../services/followUp');

const NOTE: Note = {
  id: 'n1',
  entity_type: 'customer',
  entity_id: 'c1',
  author_id: 'u1',
  content: 'Cliente pediu retorno',
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
};

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
        <NotesSection entityType="customer" entityId="c1" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('NotesSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra estado vazio quando nao ha notas', async () => {
    vi.mocked(followUpService.listNotes).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    renderSection(['notes:read']);
    expect(await screen.findByText(/nenhuma nota registrada/i)).toBeInTheDocument();
  });

  it('lista as notas existentes', async () => {
    vi.mocked(followUpService.listNotes).mockResolvedValue({
      data: [NOTE],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderSection(['notes:read']);
    expect(await screen.findByText('Cliente pediu retorno')).toBeInTheDocument();
  });

  it('RBAC visual: sem notes:create/update/delete, nao mostra acoes de escrita', async () => {
    vi.mocked(followUpService.listNotes).mockResolvedValue({
      data: [NOTE],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderSection(['notes:read']);
    await screen.findByText('Cliente pediu retorno');
    expect(screen.queryByRole('button', { name: /adicionar nota/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir$/i })).not.toBeInTheDocument();
  });

  it('cria uma nova nota vinculada a entidade', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listNotes).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    vi.mocked(followUpService.createNote).mockResolvedValue(NOTE);
    renderSection(['notes:read', 'notes:create']);

    await user.click(await screen.findByRole('button', { name: /adicionar nota/i }));
    await user.type(screen.getByLabelText(/^nota$/i), 'Cliente pediu retorno');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() =>
      expect(followUpService.createNote).toHaveBeenCalledWith({
        entity_type: 'customer',
        entity_id: 'c1',
        content: 'Cliente pediu retorno',
      }),
    );
  });

  it('exclui uma nota quando permitido', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listNotes).mockResolvedValue({
      data: [NOTE],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(followUpService.deleteNote).mockResolvedValue(undefined);
    renderSection(['notes:read', 'notes:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    await waitFor(() => expect(followUpService.deleteNote).toHaveBeenCalledWith('n1'));
  });
});
