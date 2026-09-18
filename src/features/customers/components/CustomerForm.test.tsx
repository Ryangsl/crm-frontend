import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { CustomerForm } from './CustomerForm';
import * as customersService from '../services/customers';
import type { Customer } from '../types/customer';

vi.mock('../services/customers');

function renderForm(props: Partial<ComponentProps<typeof CustomerForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CustomerForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

const CUSTOMER: Customer = {
  id: 'c1',
  name: 'Cliente Teste',
  document: '52998224725',
  primary_phone: null,
  primary_email: null,
  owner_id: null,
  tags: [],
  custom_fields: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('CustomerForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cria um cliente com sucesso e chama onSuccess', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.createCustomer).mockResolvedValue(CUSTOMER);
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText(/^nome$/i), 'Cliente Teste');
    await user.click(screen.getByRole('button', { name: /criar cliente/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(CUSTOMER));
    expect(customersService.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cliente Teste' }),
    );
  });

  it('em 409, mostra os candidatos retornados e nao chama onSuccess', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.createCustomer).mockRejectedValue(
      new ApiError(409, 'CUSTOMER_DUPLICATE', 'Ja existe cliente com os dados informados.', [], {
        candidates: [
          {
            id: 'existing-1',
            name: 'Cliente Existente',
            document: '52998224725',
            primary_phone: null,
            primary_email: null,
          },
        ],
      }),
    );
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText(/^nome$/i), 'Novo Cliente');
    await user.type(screen.getByLabelText(/documento/i), '529.982.247-25');
    await user.click(screen.getByRole('button', { name: /criar cliente/i }));

    expect(await screen.findByText(/ja existe cliente com esses dados/i)).toBeInTheDocument();
    expect(screen.getByText('Cliente Existente')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('em 403, mostra mensagem de permissao', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.createCustomer).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Sem permissao.'),
    );
    renderForm();

    await user.type(screen.getByLabelText(/^nome$/i), 'Cliente Teste');
    await user.click(screen.getByRole('button', { name: /criar cliente/i }));

    expect(await screen.findByText(/voce nao tem permissao/i)).toBeInTheDocument();
  });

  it('em modo edicao, pre-preenche os campos e chama updateCustomer', async () => {
    const user = userEvent.setup();
    vi.mocked(customersService.updateCustomer).mockResolvedValue({
      ...CUSTOMER,
      name: 'Nome Editado',
    });
    const { onSuccess } = renderForm({ customer: CUSTOMER });

    expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Cliente Teste');

    await user.clear(screen.getByLabelText(/^nome$/i));
    await user.type(screen.getByLabelText(/^nome$/i), 'Nome Editado');
    await user.click(screen.getByRole('button', { name: /salvar alteracoes/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(customersService.updateCustomer).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'Nome Editado' }),
    );
  });
});
