import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { FollowUpsPage } from './FollowUpsPage';
import * as service from '../services/followUp';
import type { Task } from '../types/followUp';

vi.mock('../services/followUp');

const ALL = ['tasks:read', 'tasks:create', 'tasks:update', 'appointments:read'];

function renderPage(permissions: string[] = ALL) {
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
        <MemoryRouter>
          <FollowUpsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Ligar para o cliente',
    assigned_to: 'u1',
    due_at: '2020-01-01T12:00:00Z',
    status: 'pending',
    entity_type: null,
    entity_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function tasksPage(data: Task[]) {
  return { data, page: 1, limit: 100, total: data.length };
}

describe('FollowUpsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockLists(tasks: Task[] = []) {
    vi.mocked(service.listScheduledTasks).mockResolvedValue(tasksPage(tasks));
    vi.mocked(service.listScheduledAppointments).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
  }

  it('abre em "Meus" e troca para a equipe sem filtrar por responsavel', async () => {
    mockLists();
    renderPage();
    await waitFor(() =>
      expect(service.listScheduledTasks).toHaveBeenLastCalledWith({
        status: 'pending',
        assigned_to: 'u1',
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Da equipe' }));
    await waitFor(() =>
      expect(service.listScheduledTasks).toHaveBeenLastCalledWith({
        status: 'pending',
        assigned_to: undefined,
      }),
    );
    expect(screen.getByRole('button', { name: 'Da equipe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('cria tarefa avulsa, sem registro de origem', async () => {
    mockLists();
    vi.mocked(service.createTask).mockResolvedValue(task());
    renderPage();
    await screen.findByText('Você não tem tarefa pendente');

    await userEvent.click(screen.getAllByRole('button', { name: 'Nova tarefa' })[0]);
    await userEvent.type(screen.getByLabelText(/Título/), 'Enviar proposta');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(service.createTask).toHaveBeenCalled());
    const input = vi.mocked(service.createTask).mock.calls[0][0];
    expect(input).toMatchObject({ title: 'Enviar proposta', assigned_to: 'u1' });
    expect(input).not.toHaveProperty('entity_type');
    expect(input).not.toHaveProperty('entity_id');
  });

  it('conclui a tarefa atrasada pela propria lista', async () => {
    mockLists([task()]);
    vi.mocked(service.updateTask).mockResolvedValue(task({ status: 'done' }));
    renderPage();

    const overdue = await screen.findByRole('region', { name: 'Atrasadas' });
    await userEvent.click(
      within(overdue).getByRole('button', { name: 'Concluir: Ligar para o cliente' }),
    );
    await waitFor(() => expect(service.updateTask).toHaveBeenCalledWith('t1', { status: 'done' }));
  });

  it('sem tasks:create e tasks:update a tela so consulta', async () => {
    mockLists([task()]);
    renderPage(['tasks:read']);
    await screen.findByText('Ligar para o cliente');
    expect(screen.queryByRole('button', { name: 'Nova tarefa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir/ })).not.toBeInTheDocument();
  });
});
