import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { CustomerDetailPage } from './CustomerDetailPage';
import * as customersService from '../services/customers';
import type { Customer } from '../types/customer';

vi.mock('../services/customers');

const CUSTOMER: Customer = {
  id: 'c1',
  name: 'Cliente Teste',
  document: '52998224725',
  primary_phone: '+5511999999999',
  primary_email: null,
  owner_id: null,
  tags: [],
  custom_fields: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

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
        <MemoryRouter initialEntries={['/customers/c1']}>
          <Routes>
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/customers" element={<p>Lista de clientes</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('CustomerDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra os dados do cliente e a secao de contatos', async () => {
    vi.mocked(customersService.getCustomer).mockResolvedValue(CUSTOMER);
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    renderPage(['customers:read']);

    expect(await screen.findByRole('heading', { name: 'Cliente Teste' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contatos/i })).toBeInTheDocument();
  });

  it('RBAC visual: sem customers:update/delete, não mostra Editar nem Excluir', async () => {
    vi.mocked(customersService.getCustomer).mockResolvedValue(CUSTOMER);
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    renderPage(['customers:read']);

    await screen.findByRole('heading', { name: 'Cliente Teste' });
    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir$/i })).not.toBeInTheDocument();
  });

  it('exclusão pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.getCustomer).mockResolvedValue(CUSTOMER);
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    vi.mocked(customersService.deleteCustomer).mockResolvedValue(undefined);
    renderPage(['customers:read', 'customers:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    expect(customersService.deleteCustomer).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirmar exclusão/i }));
    await waitFor(() => expect(customersService.deleteCustomer).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText('Lista de clientes')).toBeInTheDocument();
  });

  it('D-098: com oportunidade em andamento, mostra a recusa do backend e continua no cliente', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.getCustomer).mockResolvedValue(CUSTOMER);
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    vi.mocked(customersService.deleteCustomer).mockRejectedValue(
      new ApiError(
        409,
        'CUSTOMER_HAS_OPEN_OPPORTUNITIES',
        'Este cliente tem 1 oportunidade em andamento. Ganhe, perca ou exclua a oportunidade antes de excluir o cliente.',
      ),
    );
    renderPage(['customers:read', 'customers:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    await user.click(screen.getByRole('button', { name: /confirmar exclusão/i }));

    expect(await screen.findByText(/1 oportunidade em andamento/)).toBeInTheDocument();
    expect(screen.queryByText('Lista de clientes')).not.toBeInTheDocument();
  });
});
