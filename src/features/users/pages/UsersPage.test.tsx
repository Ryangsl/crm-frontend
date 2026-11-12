import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as api from '@/services/api';
import { ApiError } from '@/services/api';
import type { TenantRole, TenantUser } from '../hooks/useUsers';
import { UsersPage } from './UsersPage';

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const ADMIN_PERMISSIONS = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'roles:read',
  'leads:read',
  'leads:update',
];
const ROLES: TenantRole[] = [
  { id: 'r-admin', name: 'admin', is_system: true, permissions: ADMIN_PERMISSIONS },
  { id: 'r-vend', name: 'vendedor', is_system: true, permissions: ['leads:read', 'leads:update'] },
  { id: 'r-dir', name: 'diretor', is_system: true, permissions: ['users:read', 'leads:read'] },
];
const ANA: TenantUser = {
  id: 'u-ana',
  name: 'Ana Admin',
  email: 'ana@empresa.com',
  status: 'active',
  created_at: '2026-11-01T12:00:00.000Z',
  roles: ['admin'],
  role_ids: ['r-admin'],
};
const BRUNO: TenantUser = {
  id: 'u-bruno',
  name: 'Bruno Vendas',
  email: 'bruno@empresa.com',
  status: 'active',
  created_at: '2026-11-02T12:00:00.000Z',
  roles: ['vendedor'],
  role_ids: ['r-vend'],
};
const CARLA: TenantUser = {
  id: 'u-carla',
  name: 'Carla Antiga',
  email: 'carla@empresa.com',
  status: 'inactive',
  roles: [],
  role_ids: [],
};

function renderPage(permissions = ADMIN_PERMISSIONS, roles = ['admin']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth: AuthState = {
    status: 'authenticated',
    user: {
      id: 'u-ana',
      name: 'Ana Admin',
      email: 'ana@empresa.com',
      status: 'active',
      permissions,
      roles,
    },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key: string) => permissions.includes(key),
  };
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.apiGet).mockImplementation(async (path: string) => {
    if (path.startsWith('/v1/users'))
      return { data: [ANA, BRUNO, CARLA], page: 1, limit: 20, total: 3 };
    if (path === '/v1/roles') return ROLES;
    throw new Error(`rota inesperada ${path}`);
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Usuários (gestao pelo Admin da empresa)', () => {
  it('lista usuários com papeis, situação e indica a própria pessoa', async () => {
    renderPage();

    const row = (await screen.findByRole('button', { name: 'Bruno Vendas' })).closest('tr')!;
    // Uma vez na coluna de e-mail e outra na linha de celular (abaixo do nome).
    expect(within(row).getAllByText('bruno@empresa.com')).toHaveLength(2);
    expect(within(row).getAllByText('vendedor').length).toBeGreaterThan(0);
    // Situacao: coluna propria a partir de `sm` e, no celular, abaixo do nome.
    expect(within(row).getAllByText('Ativo')).toHaveLength(2);
    expect(screen.getByText('(você)')).toBeInTheDocument();
    const inactive = screen.getByRole('button', { name: 'Carla Antiga' }).closest('tr')!;
    expect(within(inactive).getAllByText('Inativo')).toHaveLength(2);
    // Inativo nao tem "Desativar": tem "Reativar" (D-093).
    expect(
      screen.queryByRole('button', { name: 'Desativar Carla Antiga' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar Carla Antiga' })).toBeInTheDocument();
  });

  it('consulta os detalhes de um usuário', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Carla Antiga' }));

    const dialog = screen.getByRole('dialog', { name: 'Carla Antiga' });
    expect(within(dialog).getByText('carla@empresa.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Sem papel')).toBeInTheDocument();
    expect(within(dialog).getByText(/Use Reativar para devolver o acesso/)).toBeInTheDocument();
  });

  it('cria usuário com papeis', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({ ...BRUNO, id: 'u-novo' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Novo usuário/ }));

    const dialog = screen.getByRole('dialog', { name: 'Novo usuário' });
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: ' Dani ' } });
    fireEvent.change(within(dialog).getByLabelText('E-mail'), {
      target: { value: 'dani@empresa.com' },
    });
    fireEvent.change(within(dialog).getByLabelText('Senha inicial'), {
      target: { value: 'SenhaForte123' },
    });
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: /vendedor/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    await waitFor(() =>
      expect(api.apiPost).toHaveBeenCalledWith('/v1/users', {
        name: 'Dani',
        email: 'dani@empresa.com',
        password: 'SenhaForte123',
        role_ids: ['r-vend'],
      }),
    );
    expect(await screen.findByText('Usuário criado.')).toBeInTheDocument();
  });

  it('edita nome e papeis enviando só o que mudou', async () => {
    vi.mocked(api.apiPatch).mockResolvedValue(BRUNO);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Bruno Vendas' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar usuário' });
    expect(within(dialog).getByText('bruno@empresa.com')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Senha inicial')).not.toBeInTheDocument();
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: /diretor/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(api.apiPatch).toHaveBeenCalledWith('/v1/users/u-bruno', {
        role_ids: ['r-vend', 'r-dir'],
      }),
    );
  });

  it('o Admin não tem "Desativar" na própria linha: só outro Admin o desativa', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Editar Ana Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar Ana Admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desativar Bruno Vendas' })).toBeInTheDocument();
  });

  it('explica as recusas do backend ao desativar', async () => {
    vi.mocked(api.apiDelete).mockRejectedValue(
      new ApiError(403, 'USER_MANAGEMENT_FORBIDDEN', 'x', [
        { field: 'id', issue: 'ADMIN_SELF_DEACTIVATION' },
      ]),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Desativar Bruno Vendas' }));
    const dialog = screen.getByRole('dialog', { name: 'Desativar usuário' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desativar' }));

    expect(
      await within(dialog).findByText(
        'Um Admin não pode desativar a si mesmo. Peça a outro Admin.',
      ),
    ).toBeInTheDocument();
  });

  it('desativa outro usuário depois de confirmar', async () => {
    vi.mocked(api.apiDelete).mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Desativar Bruno Vendas' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Desativar usuário' })).getByRole('button', {
        name: 'Desativar',
      }),
    );

    expect(await screen.findByText('Usuário desativado.')).toBeInTheDocument();
    expect(api.apiDelete).toHaveBeenCalledWith('/v1/users/u-bruno');
  });

  it('quem não e Admin ve o papel Admin indisponível e a recusa do backend explicada', async () => {
    const editor = ['users:read', 'users:update', 'roles:read', 'leads:read', 'leads:update'];
    vi.mocked(api.apiPatch).mockRejectedValue(
      new ApiError(403, 'ROLE_ASSIGNMENT_FORBIDDEN', 'x', [
        { field: 'role_ids', issue: 'ROLE_EXCEEDS_ACTOR' },
      ]),
    );
    renderPage(editor, ['editor']);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Bruno Vendas' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar usuário' });
    expect(await within(dialog).findByRole('checkbox', { name: /admin/ })).toBeDisabled();
    expect(
      within(dialog).getByText(
        'O papel Admin é concedido e retirado só pela equipe do CRM Universal.',
      ),
    ).toBeInTheDocument();
    // Diretor tem users:read e leads:read, que o editor tem: a opcao fica disponivel.
    const director = within(dialog).getByRole('checkbox', { name: /diretor/ });
    expect(director).toBeEnabled();
    fireEvent.click(director);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(
      await within(dialog).findByText(/só pode conceder ou retirar papéis cujas permissões/),
    ).toBeInTheDocument();
  });

  it('Diretor (só leitura) consulta sem ações de gestao', async () => {
    renderPage(['users:read', 'roles:read', 'leads:read'], ['diretor']);

    expect(await screen.findByRole('button', { name: 'Bruno Vendas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo usuário/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Desativar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument();
  });

  it('reativa um usuário e mostra o link de senha uma vez (D-093)', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({
      ...CARLA,
      status: 'active',
      password_reset: { token: 'id-1.segredo', expires_at: '2026-11-07T12:00:00.000Z' },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Reativar Carla Antiga' }));
    const confirm = screen.getByRole('dialog', { name: 'Reativar usuário' });
    expect(within(confirm).getByText(/papéis anteriores/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Reativar' }));

    const result = await screen.findByRole('dialog', { name: 'Usuário reativado' });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/users/u-carla/reactivate');
    const link = within(result).getByLabelText(/Link de redefinição de senha para Carla Antiga/);
    expect((link as HTMLTextAreaElement).value).toBe(
      `${window.location.origin}/redefinir-senha#token=id-1.segredo`,
    );
    expect(within(result).getByText(/Vale uma única vez/)).toBeInTheDocument();
    // O modal tem o X e o botao do rodape, os dois "Fechar".
    fireEvent.click(within(result).getAllByRole('button', { name: 'Fechar' }).at(-1)!);
    expect(await screen.findByText('Usuário reativado.')).toBeInTheDocument();
  });

  it('gera link de senha para outra pessoa ativa, nunca para si (D-064)', async () => {
    vi.mocked(api.apiPost).mockResolvedValue({
      token: 'id-2.outro',
      expires_at: '2026-11-07T12:00:00.000Z',
    });
    renderPage();
    expect(
      await screen.findByRole('button', { name: 'Gerar link de senha para Bruno Vendas' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Gerar link de senha para Ana Admin' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gerar link de senha para Bruno Vendas' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Gerar link de senha' })).getByRole('button', {
        name: 'Gerar link',
      }),
    );
    await screen.findByRole('dialog', { name: 'Link de redefinição de senha' });
    expect(api.apiPost).toHaveBeenCalledWith('/v1/users/u-bruno/password-reset');
  });

  it('explica a recusa por limite do plano ao reativar', async () => {
    vi.mocked(api.apiPost).mockRejectedValue(new ApiError(403, 'PLAN_LIMIT_REACHED', 'x'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Reativar Carla Antiga' }));
    const dialog = screen.getByRole('dialog', { name: 'Reativar usuário' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reativar' }));
    expect(await within(dialog).findByText(/limite de usuários ativos/)).toBeInTheDocument();
  });

  it('sem users:read não consulta', () => {
    renderPage([], []);

    expect(screen.getByText(/não tem permissão para ver os usuários/)).toBeInTheDocument();
    expect(api.apiGet).not.toHaveBeenCalled();
  });
});
