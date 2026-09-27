import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { AppointmentsSection } from './AppointmentsSection';
import * as followUpService from '../services/followUp';
import type { Appointment } from '../types/followUp';

vi.mock('../services/followUp');

const APPOINTMENT: Appointment = {
  id: 'a1',
  user_id: 'u1',
  starts_at: '2026-10-02T13:00:00Z',
  ends_at: '2026-10-02T14:00:00Z',
  entity_type: 'customer',
  entity_id: 'c1',
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
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
        <AppointmentsSection entityType="customer" entityId="c1" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AppointmentsSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra estado vazio quando nao ha compromissos', async () => {
    vi.mocked(followUpService.listAppointments).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
    renderSection(['appointments:read']);
    expect(await screen.findByText(/nenhum compromisso agendado/i)).toBeInTheDocument();
  });

  it('lista os compromissos existentes', async () => {
    vi.mocked(followUpService.listAppointments).mockResolvedValue({
      data: [APPOINTMENT],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderSection(['appointments:read']);
    expect(await screen.findByRole('listitem')).toBeInTheDocument();
  });

  it('cria um novo compromisso vinculado a entidade e ao usuario atual', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listAppointments).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
    vi.mocked(followUpService.createAppointment).mockResolvedValue(APPOINTMENT);
    renderSection(['appointments:read', 'appointments:create']);

    await user.click(await screen.findByRole('button', { name: /adicionar compromisso/i }));
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() =>
      expect(followUpService.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', entity_type: 'customer', entity_id: 'c1' }),
      ),
    );
  });

  it('RBAC visual: sem appointments:create/update/delete, nao mostra acoes de escrita', async () => {
    vi.mocked(followUpService.listAppointments).mockResolvedValue({
      data: [APPOINTMENT],
      page: 1,
      limit: 100,
      total: 1,
    });
    renderSection(['appointments:read']);
    await screen.findByRole('listitem');
    expect(
      screen.queryByRole('button', { name: /adicionar compromisso/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^excluir$/i })).not.toBeInTheDocument();
  });

  it('exclui um compromisso quando permitido', async () => {
    const user = userEvent.setup();
    vi.mocked(followUpService.listAppointments).mockResolvedValue({
      data: [APPOINTMENT],
      page: 1,
      limit: 100,
      total: 1,
    });
    vi.mocked(followUpService.deleteAppointment).mockResolvedValue(undefined);
    renderSection(['appointments:read', 'appointments:delete']);

    await user.click(await screen.findByRole('button', { name: /^excluir$/i }));
    await waitFor(() => expect(followUpService.deleteAppointment).toHaveBeenCalledWith('a1'));
  });
});
