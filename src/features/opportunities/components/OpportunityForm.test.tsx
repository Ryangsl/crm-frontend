import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as customersService from '@/features/customers/services/customers';
import type { Customer } from '@/features/customers/types/customer';
import { ApiError } from '@/services/api';
import { OpportunityForm } from './OpportunityForm';
import * as service from '../services/opportunities';
import { makeOpportunity, PIPELINE, renderWithProviders } from '../test-utils';

vi.mock('../services/opportunities');
vi.mock('@/features/customers/services/customers');

const CUSTOMER = {
  id: 'c1',
  name: 'Cliente Alfa',
  document: null,
  primary_phone: null,
  primary_email: null,
  owner_id: null,
  tags: [],
  custom_fields: null,
  created_at: '',
  updated_at: '',
} as Customer;

function mockPipelines() {
  vi.mocked(service.listPipelines).mockResolvedValue({
    data: [PIPELINE],
    page: 1,
    limit: 100,
    total: 1,
  });
  vi.mocked(customersService.listCustomers).mockResolvedValue({
    data: [CUSTOMER],
    page: 1,
    limit: 5,
    total: 1,
  });
}

async function pickCustomer(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Buscar cliente'), 'Alfa');
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
  await user.click(await screen.findByRole('button', { name: 'Cliente Alfa' }));
}

describe('OpportunityForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('criação: exige cliente; etapa inicial lista só etapas não terminais', async () => {
    mockPipelines();
    renderWithProviders(<OpportunityForm onSuccess={vi.fn()} />);

    const submit = await screen.findByRole('button', { name: 'Criar oportunidade' });
    expect(submit).toBeDisabled(); // sem cliente.

    const options = Array.from(
      (await screen.findByLabelText('Etapa inicial')).querySelectorAll('option'),
    ).map((option) => option.textContent);
    expect(options).toEqual(['Novo', 'Negociação', 'Proposta']);
  });

  it('cria com cliente, pipeline padrão e etapa inicial (sem valor quando a etapa não exige)', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.createOpportunity).mockResolvedValue(makeOpportunity());
    const onSuccess = vi.fn();
    renderWithProviders(<OpportunityForm onSuccess={onSuccess} />);

    await screen.findByLabelText('Etapa inicial');
    await pickCustomer(user);
    await user.click(screen.getByRole('button', { name: 'Criar oportunidade' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(service.createOpportunity).toHaveBeenCalledWith({
      customer_id: 'c1',
      pipeline_id: 'p1',
      stage_id: 'st1',
    });
  });

  it('D-034: etapa inicial que exige valor bloqueia o envio sem valor; com valor envia decimal exato', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.createOpportunity).mockResolvedValue(makeOpportunity({ stage_id: 'st2' }));
    renderWithProviders(<OpportunityForm onSuccess={vi.fn()} />);

    await user.selectOptions(await screen.findByLabelText('Etapa inicial'), 'st2');
    await pickCustomer(user);
    const submit = screen.getByRole('button', { name: 'Criar oportunidade' });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/a etapa selecionada exige valor/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^valor/i), '1.500,50');
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() =>
      expect(service.createOpportunity).toHaveBeenCalledWith({
        customer_id: 'c1',
        pipeline_id: 'p1',
        stage_id: 'st2',
        value: '1500.50',
      }),
    );
  });

  it('D-034: a exigência da etapa 2 não vale para a etapa 3 (Proposta aceita sem valor)', async () => {
    const user = userEvent.setup();
    mockPipelines();
    renderWithProviders(<OpportunityForm onSuccess={vi.fn()} />);

    await user.selectOptions(await screen.findByLabelText('Etapa inicial'), 'st3');
    await pickCustomer(user);
    expect(screen.getByRole('button', { name: 'Criar oportunidade' })).toBeEnabled();
  });

  it('valor inválido mostra erro e bloqueia o envio', async () => {
    const user = userEvent.setup();
    mockPipelines();
    renderWithProviders(<OpportunityForm onSuccess={vi.fn()} />);

    await screen.findByLabelText('Etapa inicial');
    await pickCustomer(user);
    await user.type(screen.getByLabelText(/^valor/i), 'abc');
    expect(screen.getByText(/informe um valor válido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar oportunidade' })).toBeDisabled();
  });

  it('a partir de um lead: cliente já vem preenchido e lead_id é enviado', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.createOpportunity).mockResolvedValue(makeOpportunity({ lead_id: 'l1' }));
    renderWithProviders(
      <OpportunityForm
        initialCustomer={{ id: 'c1', name: 'Cliente Alfa' }}
        leadId="l1"
        onSuccess={vi.fn()}
      />,
    );

    await screen.findByLabelText('Etapa inicial');
    expect(screen.getByText(/cliente selecionado/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar oportunidade' }));

    await waitFor(() =>
      expect(service.createOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({ lead_id: 'l1' }),
      ),
    );
  });

  it('erro da API (ex.: lead já tem oportunidade) e 403 são exibidos', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.createOpportunity)
      .mockRejectedValueOnce(
        new ApiError(
          409,
          'LEAD_ALREADY_HAS_OPPORTUNITY',
          'Ja existe uma oportunidade vinculada a este lead.',
        ),
      )
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'x'));
    renderWithProviders(
      <OpportunityForm
        initialCustomer={{ id: 'c1', name: 'Cliente Alfa' }}
        leadId="l1"
        onSuccess={vi.fn()}
      />,
    );

    await screen.findByLabelText('Etapa inicial');
    await user.click(screen.getByRole('button', { name: 'Criar oportunidade' }));
    expect(
      await screen.findByText(
        /já existe uma oportunidade vinculada|ja existe uma oportunidade vinculada/i,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar oportunidade' }));
    expect(await screen.findByText(/você não tem permissão/i)).toBeInTheDocument();
  });

  it('edição: só o valor é editável e é enviado como decimal', async () => {
    const user = userEvent.setup();
    mockPipelines();
    vi.mocked(service.updateOpportunity).mockResolvedValue(makeOpportunity({ value: '2500.00' }));
    const onSuccess = vi.fn();
    renderWithProviders(
      <OpportunityForm opportunity={makeOpportunity({ value: '10.00' })} onSuccess={onSuccess} />,
    );

    expect(screen.queryByLabelText('Pipeline')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Buscar cliente')).not.toBeInTheDocument();

    const value = await screen.findByLabelText(/^valor/i);
    expect(value).toHaveValue('10.00');
    await user.clear(value);
    await user.type(value, '2.500,00');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(service.updateOpportunity).toHaveBeenCalledWith('o1', { value: '2500.00' });
  });

  it('edição em etapa que exige valor não permite limpar o valor', async () => {
    const user = userEvent.setup();
    mockPipelines();
    renderWithProviders(
      <OpportunityForm
        opportunity={makeOpportunity({ stage_id: 'st2', value: '10.00' })}
        onSuccess={vi.fn()}
      />,
    );

    const value = await screen.findByLabelText(/^valor/i);
    await user.clear(value);
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });
});
