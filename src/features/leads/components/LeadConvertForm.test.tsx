import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { LeadConvertForm } from './LeadConvertForm';
import * as leadsService from '../services/leads';
import type { Lead } from '../types/lead';

vi.mock('../services/leads');

function newLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'l1',
    status: 'qualified',
    source_id: 's1',
    customer_id: null,
    owner_id: null,
    name: 'Maria Souza',
    document: '52998224725',
    phone: '+5511988887777',
    email: 'maria@exemplo.com',
    disqualify_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderForm(lead: Lead) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LeadConvertForm lead={lead} onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

async function openNewCustomer() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Novo cliente' }));
  return user;
}

describe('LeadConvertForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('abre em "Cliente existente" e "Novo cliente" vem com os dados do lead', async () => {
    renderForm(newLead());
    expect(screen.getByRole('button', { name: 'Cliente existente' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Buscar cliente')).toBeInTheDocument();

    await openNewCustomer();
    expect(screen.getByRole('button', { name: 'Novo cliente' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Maria Souza');
    expect(screen.getByLabelText('Documento')).toHaveValue('52998224725');
    expect(screen.getByLabelText('Telefone')).toHaveValue('+5511988887777');
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@exemplo.com');
    expect(screen.getByText(/dados do lead já vêm preenchidos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Converter' })).toBeEnabled();
  });

  it('envia os valores editados, nao os do lead', async () => {
    const { onSuccess } = renderForm(newLead());
    const converted = newLead({ status: 'converted', customer_id: 'c1' });
    vi.mocked(leadsService.convertLead).mockResolvedValue(converted);

    const user = await openNewCustomer();
    await user.clear(screen.getByLabelText(/^Nome/));
    await user.type(screen.getByLabelText(/^Nome/), 'Maria S. Lima');
    await user.clear(screen.getByLabelText('Telefone'));
    await user.type(screen.getByLabelText('Telefone'), '(41) 98888-1111');
    await user.clear(screen.getByLabelText('E-mail'));
    await user.click(screen.getByRole('button', { name: 'Converter' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(converted));
    expect(leadsService.convertLead).toHaveBeenCalledWith('l1', {
      customer: {
        name: 'Maria S. Lima',
        document: '52998224725',
        primary_phone: '+5541988881111',
        primary_email: undefined,
      },
    });
    const body = vi.mocked(leadsService.convertLead).mock.calls[0][1];
    expect(body.customer?.primary_email).toBeUndefined();
    expect(body).not.toHaveProperty('customer_id');
  });

  it('lead sem telefone, e-mail e documento: campos vazios, sem "null"/"undefined"', async () => {
    vi.mocked(leadsService.convertLead).mockResolvedValue(newLead({ status: 'converted' }));
    renderForm(newLead({ phone: null, email: undefined, document: null }));

    const user = await openNewCustomer();
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Maria Souza');
    expect(screen.getByLabelText('Documento')).toHaveValue('');
    expect(screen.getByLabelText('Telefone')).toHaveValue('');
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.queryByDisplayValue(/null|undefined/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Converter' }));
    await waitFor(() => expect(leadsService.convertLead).toHaveBeenCalled());
    expect(leadsService.convertLead).toHaveBeenCalledWith('l1', {
      customer: {
        name: 'Maria Souza',
        document: undefined,
        primary_phone: undefined,
        primary_email: undefined,
      },
    });
  });

  it('lead sem nenhum dado: formulario vazio, sem aviso de preenchimento e sem envio', async () => {
    renderForm(newLead({ name: null, phone: null, email: null, document: null }));

    await openNewCustomer();
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
    expect(screen.queryByText(/dados do lead já vêm preenchidos/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Converter' })).toBeDisabled();
  });

  it('409 CUSTOMER_DUPLICATE: mostra os candidatos e mantem o que foi digitado', async () => {
    vi.mocked(leadsService.convertLead).mockRejectedValue(
      new ApiError(409, 'CUSTOMER_DUPLICATE', 'Já existe cliente com os dados informados.', [], {
        candidates: [
          {
            id: 'c9',
            name: 'Maria Cliente',
            document: '52998224725',
            primary_phone: null,
            primary_email: null,
          },
        ],
      }),
    );
    const { onSuccess } = renderForm(newLead());

    const user = await openNewCustomer();
    await user.type(screen.getByLabelText(/^Nome/), ' Lima');
    await user.click(screen.getByRole('button', { name: 'Converter' }));

    expect(await screen.findByText('Já existe cliente com esses dados')).toBeInTheDocument();
    expect(screen.getByText('Maria Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Maria Souza Lima');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
