import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ContactsSection } from './ContactsSection';
import * as customersService from '../services/customers';
import type { Contact } from '../types/customer';

vi.mock('../services/customers');

const CONTACT: Contact = {
  id: 'ct1',
  customer_id: 'c1',
  name: 'Fulano',
  phone: '+5511988887777',
  email: null,
  role: 'Financeiro',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
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
        <ContactsSection customerId="c1" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ContactsSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra estado vazio quando o cliente nao tem contatos', async () => {
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    renderSection(['customers:read']);
    expect(await screen.findByText(/nenhum contato cadastrado/i)).toBeInTheDocument();
  });

  it('lista os contatos existentes', async () => {
    vi.mocked(customersService.listContacts).mockResolvedValue([CONTACT]);
    renderSection(['customers:read']);
    expect(await screen.findByText('Fulano')).toBeInTheDocument();
  });

  it('RBAC visual: sem customers:update, nao mostra Adicionar contato nem Editar', async () => {
    vi.mocked(customersService.listContacts).mockResolvedValue([CONTACT]);
    renderSection(['customers:read']);
    await screen.findByText('Fulano');
    expect(screen.queryByRole('button', { name: /adicionar contato/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
  });

  it('cria um novo contato', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.listContacts).mockResolvedValue([]);
    vi.mocked(customersService.createContact).mockResolvedValue(CONTACT);
    renderSection(['customers:read', 'customers:update']);

    await user.click(await screen.findByRole('button', { name: /adicionar contato/i }));
    await user.type(screen.getByLabelText(/^nome$/i), 'Fulano');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() =>
      expect(customersService.createContact).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ name: 'Fulano' }),
      ),
    );
  });

  it('exclui um contato quando permitido', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.listContacts).mockResolvedValue([CONTACT]);
    vi.mocked(customersService.deleteContact).mockResolvedValue(undefined);
    renderSection(['customers:read', 'customers:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    await waitFor(() => expect(customersService.deleteContact).toHaveBeenCalledWith('c1', 'ct1'));
  });
});
