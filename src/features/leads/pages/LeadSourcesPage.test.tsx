import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as leadsService from '../services/leads';
import { LeadSourcesPage } from './LeadSourcesPage';

vi.mock('../services/leads');

const ALL = [
  'lead_sources:read',
  'lead_sources:create',
  'lead_sources:update',
  'lead_sources:delete',
];

function renderPage(permissions = ALL) {
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions, roles: [] },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key) => permissions.includes(key),
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <LeadSourcesPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(leadsService.listLeadSources).mockResolvedValue({
    data: [
      { id: 's1', name: 'Indicação', created_at: '', updated_at: '' },
      { id: 's2', name: 'Site', created_at: '', updated_at: '' },
    ],
    page: 1,
    limit: 100,
    total: 2,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Origens de Lead (D-094)', () => {
  it('lista e cria uma origem', async () => {
    vi.mocked(leadsService.createLeadSource).mockResolvedValue({
      id: 's3',
      name: 'Feira',
      created_at: '',
      updated_at: '',
    });
    renderPage();
    expect(await screen.findByText('Indicação')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nova origem'), { target: { value: '  Feira ' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));

    await waitFor(() => expect(leadsService.createLeadSource).toHaveBeenCalledWith('Feira'));
    expect(await screen.findByText('Origem criada.')).toBeInTheDocument();
  });

  it('renomeia e desativa', async () => {
    vi.mocked(leadsService.renameLeadSource).mockResolvedValue({
      id: 's2',
      name: 'Site da empresa',
      created_at: '',
      updated_at: '',
    });
    vi.mocked(leadsService.deleteLeadSource).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Renomear Site' }));
    const rename = screen.getByRole('dialog', { name: 'Renomear origem' });
    fireEvent.change(within(rename).getByLabelText('Nome da origem'), {
      target: { value: 'Site da empresa' },
    });
    fireEvent.click(within(rename).getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(leadsService.renameLeadSource).toHaveBeenCalledWith('s2', 'Site da empresa'),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Desativar Indicação' }));
    const remove = screen.getByRole('dialog', { name: 'Desativar origem' });
    expect(within(remove).getByText(/continuam com ela/)).toBeInTheDocument();
    fireEvent.click(within(remove).getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(leadsService.deleteLeadSource).toHaveBeenCalledWith('s1'));
    expect(await screen.findByText('Origem desativada.')).toBeInTheDocument();
  });

  it('so leitura: lista sem acoes de gestao', async () => {
    renderPage(['lead_sources:read']);
    expect(await screen.findByText('Site')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova origem')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Renomear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Desativar/ })).not.toBeInTheDocument();
  });

  it('sem lead_sources:read nao consulta', () => {
    renderPage([]);
    expect(screen.getByText(/não tem permissão para ver as origens/)).toBeInTheDocument();
    expect(leadsService.listLeadSources).not.toHaveBeenCalled();
  });
});
