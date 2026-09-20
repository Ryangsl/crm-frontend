import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import type { Opportunity, Pipeline, Stage } from './types/opportunity';

// Fixtures/helper so para testes desta feature (nenhum componente exportado aqui).

export function renderWithProviders(
  ui: ReactElement,
  { permissions = [] as string[], initialEntry = '/' } = {},
) {
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
        <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function stage(id: string, name: string, order: number, extra: Partial<Stage> = {}): Stage {
  return {
    id,
    pipeline_id: 'p1',
    name,
    order,
    is_won: false,
    is_lost: false,
    requires_value: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

// Novo(1) | Negociação(2, exige valor) | Proposta(3) | Ganho(4, is_won, exige valor) | Perdido(5, is_lost)
export const STAGES: Stage[] = [
  stage('st1', 'Novo', 1),
  stage('st2', 'Negociação', 2, { requires_value: true }),
  stage('st3', 'Proposta', 3),
  stage('st4', 'Ganho', 4, { is_won: true, requires_value: true }),
  stage('st5', 'Perdido', 5, { is_lost: true }),
];

export const PIPELINE: Pipeline = {
  id: 'p1',
  name: 'Pipeline Padrão',
  is_default: true,
  stages: STAGES,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'o1',
    customer_id: 'c1',
    customer: { id: 'c1', name: 'Cliente Alfa' },
    lead_id: null,
    pipeline_id: 'p1',
    stage_id: 'st1',
    owner_id: 'u1',
    owner: { id: 'u1', name: 'Ana' },
    value: null,
    status: 'open',
    lost_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
