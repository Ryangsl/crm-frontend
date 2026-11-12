import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as importsService from '../services/lead-imports';
import * as leadsService from '../services/leads';
import { isLeadImportRunning } from '../hooks/useLeadImports';
import type { LeadImport, LeadImportRow } from '../types/lead-import';
import { LeadImportDetailPage } from './LeadImportDetailPage';
import { LeadImportsPage } from './LeadImportsPage';

vi.mock('../services/lead-imports');
vi.mock('../services/leads');
vi.mock('@/features/users/hooks/useUsers', () => ({
  useUserDirectory: () => ({
    data: {
      data: [
        { id: 'u2', name: 'Bruno', status: 'active' },
        { id: 'u3', name: 'Carla', status: 'inactive' },
      ],
    },
  }),
  useUserNames: () => new Map([['u2', 'Bruno']]),
}));

const IMPORTER = ['leads:create', 'leads:read'];

function record(overrides: Partial<LeadImport> = {}): LeadImport {
  return {
    id: 'imp1',
    status: 'completed',
    file_name: 'leads.csv',
    source_id: 's1',
    owner_id: null,
    created_by: { id: 'u1', name: 'Ana' },
    total_rows: 4,
    processed_rows: 4,
    created_count: 2,
    skipped_count: 1,
    error_count: 1,
    failure_code: null,
    created_at: '2026-11-10T12:00:00.000Z',
    started_at: '2026-11-10T12:00:01.000Z',
    finished_at: '2026-11-10T12:00:05.000Z',
    ...overrides,
  };
}

const ROWS: LeadImportRow[] = [
  {
    row: 2,
    status: 'created',
    data: { name: 'Maria', document: null, phone: null, email: 'maria@x.com' },
    lead_id: 'l1',
    reason: null,
    processed_at: '2026-11-10T12:00:02.000Z',
  },
  {
    row: 3,
    status: 'skipped',
    data: { name: 'Joana', document: null, phone: null, email: 'joana@x.com' },
    lead_id: 'l0',
    reason: 'duplicate',
    processed_at: '2026-11-10T12:00:02.000Z',
  },
  {
    row: 4,
    status: 'failed',
    data: { name: 'Bia', document: null, phone: null, email: 'sem-arroba' },
    lead_id: null,
    reason: 'invalid_email',
    processed_at: '2026-11-10T12:00:02.000Z',
  },
];

function renderAt(path: string, permissions = IMPORTER) {
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
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/leads/imports" element={<LeadImportsPage />} />
            <Route path="/leads/imports/:id" element={<LeadImportDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(leadsService.listLeadSources).mockResolvedValue({
    data: [{ id: 's1', name: 'Planilha', created_at: '', updated_at: '' }],
    page: 1,
    limit: 100,
    total: 1,
  });
  vi.mocked(importsService.listLeadImports).mockResolvedValue({
    data: [record(), record({ id: 'imp2', file_name: 'base.xlsx', status: 'processing' })],
    page: 1,
    limit: 20,
    total: 2,
  });
  vi.mocked(importsService.getLeadImport).mockResolvedValue(record());
  vi.mocked(importsService.listLeadImportRows).mockResolvedValue({
    data: ROWS,
    page: 1,
    limit: 50,
    total: 3,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Importação de leads (D-096)', () => {
  it('lista as importações enviadas com a situação de cada uma', async () => {
    renderAt('/leads/imports');
    const table = await screen.findByRole('table', { name: 'Importações' });
    expect(within(table).getByRole('link', { name: 'leads.csv' })).toHaveAttribute(
      'href',
      '/leads/imports/imp1',
    );
    expect(within(table).getByText('Concluída')).toBeInTheDocument();
    expect(within(table).getByText('Processando')).toBeInTheDocument();
  });

  it('exige arquivo e origem antes de enviar', async () => {
    renderAt('/leads/imports');
    await screen.findByRole('option', { name: 'Planilha' });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar arquivo' }));
    expect(await screen.findByText('Escolha um arquivo CSV ou XLSX.')).toBeInTheDocument();
    expect(screen.getByText('Escolha a origem dos leads.')).toBeInTheDocument();
    expect(importsService.importLeads).not.toHaveBeenCalled();

    const pdf = new File(['x'], 'leads.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Arquivo'), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar arquivo' }));
    expect(
      await screen.findByText('Formato não aceito. Envie um arquivo CSV ou XLSX.'),
    ).toBeInTheDocument();
  });

  it('envia o arquivo com origem e responsável e abre o acompanhamento', async () => {
    vi.mocked(importsService.importLeads).mockResolvedValue(
      record({ id: 'imp9', status: 'queued', processed_rows: 0, created_count: 0 }),
    );
    renderAt('/leads/imports');
    await screen.findByRole('option', { name: 'Planilha' });

    const csv = new File(['nome\nAna'], 'novos.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Arquivo'), { target: { files: [csv] } });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 's1' } });
    // So usuarios ativos aparecem como responsavel.
    expect(screen.queryByRole('option', { name: 'Carla' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'u2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar arquivo' }));

    await waitFor(() =>
      expect(importsService.importLeads).toHaveBeenCalledWith({
        file: csv,
        sourceId: 's1',
        ownerId: 'u2',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'leads.csv' })).toBeInTheDocument();
    expect(importsService.getLeadImport).toHaveBeenCalledWith('imp9');
  });

  it('mostra o erro devolvido pela API no envio', async () => {
    vi.mocked(importsService.importLeads).mockRejectedValue(
      new Error('O limite por importação e de 5000 leads.'),
    );
    renderAt('/leads/imports');
    await screen.findByRole('option', { name: 'Planilha' });
    fireEvent.change(screen.getByLabelText('Arquivo'), {
      target: { files: [new File(['x'], 'grande.csv')] },
    });
    fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 's1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar arquivo' }));
    expect(await screen.findByText('O limite por importação e de 5000 leads.')).toBeInTheDocument();
  });

  it('sem permissão de criar e ver leads, não oferece o envio', async () => {
    renderAt('/leads/imports', ['leads:read']);
    expect(await screen.findByText('Sem permissão para importar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar arquivo' })).not.toBeInTheDocument();
    expect(importsService.listLeadImports).not.toHaveBeenCalled();
  });

  it('acompanhamento: contadores, motivo de cada linha e link para o lead', async () => {
    renderAt('/leads/imports/imp1');
    expect(await screen.findByRole('heading', { name: 'leads.csv' })).toBeInTheDocument();
    expect(screen.getByText('4 de 4 linha(s) processada(s)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Andamento da importação' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByText('Distribuição automática')).toBeInTheDocument();

    // Concluida com erros: abre direto nas linhas com erro.
    await waitFor(() =>
      expect(importsService.listLeadImportRows).toHaveBeenCalledWith('imp1', {
        page: 1,
        status: 'failed',
        limit: 50,
      }),
    );
    const table = await screen.findByRole('table', { name: 'Linhas da importação' });
    expect(within(table).getByText('E-mail inválido.')).toBeInTheDocument();
    expect(
      within(table).getByText('Já existe um lead com este documento, telefone ou e-mail.'),
    ).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Ver lead criado' })).toHaveAttribute(
      'href',
      '/leads/l1',
    );
    expect(within(table).getByRole('link', { name: 'Ver lead existente' })).toHaveAttribute(
      'href',
      '/leads/l0',
    );

    fireEvent.change(screen.getByLabelText('Mostrar'), { target: { value: '' } });
    await waitFor(() =>
      expect(importsService.listLeadImportRows).toHaveBeenLastCalledWith('imp1', {
        page: 1,
        status: undefined,
        limit: 50,
      }),
    );
  });

  it('importação interrompida mostra o motivo e preserva o que foi processado', async () => {
    vi.mocked(importsService.getLeadImport).mockResolvedValue(
      record({
        status: 'failed',
        failure_code: 'plan_blocked',
        owner_id: 'u2',
        processed_rows: 1,
        created_count: 1,
        skipped_count: 0,
        error_count: 0,
      }),
    );
    renderAt('/leads/imports/imp1');
    expect(await screen.findByText('Importação interrompida')).toBeInTheDocument();
    expect(
      screen.getByText(/O plano da empresa não permite mais importar leads\./),
    ).toBeInTheDocument();
    expect(screen.getByText('1 de 4 linha(s) processada(s)')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
  });

  it('em andamento avisa que roda em segundo plano', async () => {
    vi.mocked(importsService.getLeadImport).mockResolvedValue(
      record({ status: 'processing', processed_rows: 1 }),
    );
    renderAt('/leads/imports/imp1');
    expect(
      await screen.findByText(/Processando em segundo plano\. Você pode sair desta tela/),
    ).toBeInTheDocument();
  });

  it('consulta o andamento só enquanto a importação está na fila ou rodando', () => {
    expect(isLeadImportRunning({ status: 'queued' })).toBe(true);
    expect(isLeadImportRunning({ status: 'processing' })).toBe(true);
    expect(isLeadImportRunning({ status: 'completed' })).toBe(false);
    expect(isLeadImportRunning({ status: 'failed' })).toBe(false);
    expect(isLeadImportRunning(undefined)).toBe(false);
  });
});
