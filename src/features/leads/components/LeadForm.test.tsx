import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { LeadForm } from './LeadForm';
import * as leadsService from '../services/leads';
import type { Lead, LeadSourceListResponse } from '../types/lead';

vi.mock('../services/leads');

function renderForm(
  props: Partial<ComponentProps<typeof LeadForm>> = {},
  permissions: string[] = ['leads:create', 'leads:update'],
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  const onCancel = vi.fn();
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions, roles: [] },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key) => permissions.includes(key),
  };
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <LeadForm onSuccess={onSuccess} onCancel={onCancel} {...props} />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

function sourcesPage(
  data = [
    { id: 's1', name: 'Site', created_at: '', updated_at: '' },
    { id: 's2', name: 'Indicação', created_at: '', updated_at: '' },
  ],
): LeadSourceListResponse {
  return { data, page: 1, limit: 100, total: data.length };
}

const LEAD: Lead = {
  id: 'l1',
  status: 'new',
  source_id: 's1',
  customer_id: null,
  owner_id: null,
  name: 'Carla Souza',
  phone: '+5511988887777',
  email: null,
  document: null,
  disqualify_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('LeadForm (cadastro manual, D-094)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cria um lead com nome, contato, documento e origem, no formato da API', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.createLead).mockResolvedValue(LEAD);
    const { onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Nome'), '  Carla Souza ');
    await user.type(screen.getByLabelText('Telefone'), '(11) 98888-7777');
    await user.type(screen.getByLabelText('E-mail'), 'Carla@Empresa.com');
    await user.type(screen.getByLabelText(/CPF ou CNPJ/), '529.982.247-25');
    await user.selectOptions(await screen.findByLabelText(/origem/i), 's1');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(LEAD));
    expect(leadsService.createLead).toHaveBeenCalledWith({
      source_id: 's1',
      name: 'Carla Souza',
      phone: '+5511988887777',
      email: 'carla@empresa.com',
      document: '52998224725',
    });
  });

  it('exige nome, origem e ao menos um contato; documento e opcional', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    renderForm();
    await screen.findByLabelText(/origem/i);

    await user.click(screen.getByRole('button', { name: /criar lead/i }));

    expect(screen.getByText(/Informe o nome/)).toBeInTheDocument();
    expect(screen.getByText('Selecione a origem.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/telefone ou e-mail/);
    expect(leadsService.createLead).not.toHaveBeenCalled();
  });

  it('aceita so e-mail como contato e recusa telefone, e-mail e documento invalidos', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.createLead).mockResolvedValue(LEAD);
    renderForm();

    await user.type(screen.getByLabelText('Nome'), 'Dani');
    await user.type(screen.getByLabelText('Telefone'), '123');
    await user.type(screen.getByLabelText('E-mail'), 'sem-arroba');
    await user.type(screen.getByLabelText(/CPF ou CNPJ/), '123');
    await user.selectOptions(await screen.findByLabelText(/origem/i), 's2');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));
    expect(screen.getByText(/Use DDD e número/)).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido.')).toBeInTheDocument();
    expect(screen.getByText(/CPF com 11 dígitos/)).toBeInTheDocument();
    expect(leadsService.createLead).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Telefone'));
    await user.clear(screen.getByLabelText(/CPF ou CNPJ/));
    await user.clear(screen.getByLabelText('E-mail'));
    await user.type(screen.getByLabelText('E-mail'), 'dani@x.com');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));
    await waitFor(() =>
      expect(leadsService.createLead).toHaveBeenCalledWith({
        source_id: 's2',
        name: 'Dani',
        phone: undefined,
        email: 'dani@x.com',
        document: undefined,
      }),
    );
  });

  it('na edicao, pre-preenche os dados e envia null para o campo apagado', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.updateLead).mockResolvedValue({ ...LEAD, source_id: 's2' });
    const { onSuccess } = renderForm({ lead: { ...LEAD, email: 'carla@x.com' } });

    const select = await screen.findByLabelText(/origem/i);
    expect(select).toHaveValue('s1');
    expect(screen.getByLabelText('Nome')).toHaveValue('Carla Souza');
    await user.selectOptions(select, 's2');
    await user.clear(screen.getByLabelText('E-mail'));
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(leadsService.updateLead).toHaveBeenCalledWith('l1', {
      source_id: 's2',
      name: 'Carla Souza',
      phone: '+5511988887777',
      email: null,
      document: null,
    });
  });

  it('sem origens cadastradas: orienta o Admin a cadastrar e nao deixa enviar', async () => {
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage([]));
    renderForm({}, ['leads:create', 'lead_sources:create']);

    expect(await screen.findByText('Nenhuma origem cadastrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastre uma origem' })).toHaveAttribute(
      'href',
      '/settings/lead-sources',
    );
    expect(screen.getByRole('button', { name: /criar lead/i })).toBeDisabled();
  });

  it('erro de validacao da API aparece com o campo; 403 com a mensagem de permissao', async () => {
    const user = userEvent.setup();
    vi.mocked(leadsService.listLeadSources).mockResolvedValue(sourcesPage());
    vi.mocked(leadsService.createLead)
      .mockRejectedValueOnce(
        new ApiError(400, 'VALIDATION_ERROR', 'x', [
          { field: 'unknown', issue: 'phone must match /^\\+[1-9]\\d{7,14}$/ regular expression' },
        ]),
      )
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Sem permissao.'));
    renderForm();

    await user.type(screen.getByLabelText('Nome'), 'Eva');
    await user.type(screen.getByLabelText('Telefone'), '11977776666');
    await user.selectOptions(await screen.findByLabelText(/origem/i), 's1');
    await user.click(screen.getByRole('button', { name: /criar lead/i }));
    expect(await screen.findByText('Confira: Telefone.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /criar lead/i }));
    expect(await screen.findByText(/não tem permissão/i)).toBeInTheDocument();
  });
});
