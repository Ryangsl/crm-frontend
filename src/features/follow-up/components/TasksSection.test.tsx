import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { TasksSection } from './TasksSection';
import * as followUpService from '../services/followUp';
import type { Task } from '../types/followUp';

vi.mock('../services/followUp');

const TASK: Task = {
  id: 't1',
  title: 'Retornar contato',
  assigned_to: 'u1',
  due_at: '2026-10-01T12:00:00Z',
  status: 'pending',
  entity_type: 'customer',
  entity_id: 'c1',
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
        <TasksSection entityType="customer" entityId="c1" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TasksSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra estado vazio quando nao ha tarefas', async () => {
    vi.mocked(followUpService.listTasks).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    renderSection(['tasks:read']);
    expect(await screen.findByText(/nenhuma tarefa registrada/i)).toBeInTheDocument();
  });

  it('lista as tarefas existentes com prazo e status', async () => {
    vi.mocked(followUpService.listTasks).mockResolvedValue({
      data: [TASK],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderSection(['tasks:read']);
    expect(await screen.findByText('Retornar contato')).toBeInTheDocument();
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });

  it('cria uma nova tarefa atribuida ao usuario atual', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listTasks).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    vi.mocked(followUpService.createTask).mockResolvedValue(TASK);
    renderSection(['tasks:read', 'tasks:create']);

    await user.click(await screen.findByRole('button', { name: /adicionar tarefa/i }));
    await user.type(screen.getByLabelText(/^titulo$/i), 'Retornar contato');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() =>
      expect(followUpService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Retornar contato',
          assigned_to: 'u1',
          entity_type: 'customer',
          entity_id: 'c1',
        }),
      ),
    );
  });

  it('conclui uma tarefa pendente via PATCH status=done', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listTasks).mockResolvedValue({
      data: [TASK],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(followUpService.updateTask).mockResolvedValue({ ...TASK, status: 'done' });
    renderSection(['tasks:read', 'tasks:update']);

    await user.click(await screen.findByRole('button', { name: /^concluir$/i }));
    await waitFor(() =>
      expect(followUpService.updateTask).toHaveBeenCalledWith('t1', { status: 'done' }),
    );
  });

  it('RBAC visual: sem tasks:create, nao mostra Adicionar tarefa', async () => {
    vi.mocked(followUpService.listTasks).mockResolvedValue({ data: [], page: 1, limit: 100, total: 0 });
    renderSection(['tasks:read']);
    await screen.findByText(/nenhuma tarefa registrada/i);
    expect(screen.queryByRole('button', { name: /adicionar tarefa/i })).not.toBeInTheDocument();
  });
});
