import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { CustomerListPage } from './CustomerListPage';
import * as customersService from '../services/customers';
import type { CustomerListResponse } from '../types/customer';

vi.mock('../services/customers');

function renderPage(permissions: string[] = []) {
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
        <MemoryRouter initialEntries={['/customers']}>
          <CustomerListPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function page(overrides: Partial<CustomerListResponse> = {}): CustomerListResponse {
  return { data: [], page: 1, limit: 20, total: 0, ...overrides };
}

describe('CustomerListPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra o estado de carregamento antes da resposta chegar', () => {
    vi.mocked(customersService.listCustomers).mockReturnValue(new Promise(() => {}));
    renderPage(['customers:read']);
    expect(screen.getByText(/carregando clientes/i)).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha clientes', async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue(page());
    renderPage(['customers:read']);
    expect(await screen.findByText(/nenhum cliente cadastrado/i)).toBeInTheDocument();
  });

  it('mostra estado de erro e permite tentar novamente', async () => {
    vi.mocked(customersService.listCustomers).mockRejectedValue(new Error('falhou'));
    renderPage(['customers:read']);
    expect(await screen.findByText(/nao foi possivel carregar os clientes/i)).toBeInTheDocument();
  });

  it('lista os clientes retornados pela API', async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue(
      page({
        data: [
          {
            id: '1',
            name: 'Empresa Alfa',
            document: '52998224725',
            primary_phone: null,
            primary_email: null,
            owner_id: null,
            tags: [],
            custom_fields: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
      }),
    );
    renderPage(['customers:read']);
    expect(await screen.findByText('Empresa Alfa')).toBeInTheDocument();
  });

  it('RBAC visual: sem customers:create, nao mostra o botao Novo cliente', async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue(page());
    renderPage(['customers:read']);
    await screen.findByText(/nenhum cliente cadastrado/i);
    expect(screen.queryByRole('button', { name: /novo cliente/i })).not.toBeInTheDocument();
  });

  it('RBAC visual: com customers:create, mostra o botao Novo cliente', async () => {
    vi.mocked(customersService.listCustomers).mockResolvedValue(page());
    renderPage(['customers:read', 'customers:create']);
    expect(await screen.findByRole('button', { name: /novo cliente/i })).toBeInTheDocument();
  });

  it('busca envia o termo digitado para a API', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.listCustomers).mockResolvedValue(page());
    renderPage(['customers:read']);
    await screen.findByText(/nenhum cliente cadastrado/i);

    await user.type(screen.getByLabelText(/buscar/i), 'Alfa');
    await user.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() =>
      expect(customersService.listCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'Alfa', page: 1 }),
      ),
    );
  });
});
