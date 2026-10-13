// Helpers compartilhados pelos testes da feature de conversas (F4.6). Nao e importado pelo app.
/* eslint-disable react-refresh/only-export-components -- arquivo so de teste, sem fast refresh */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import type { Conversation, Message } from './types/conversations';

export const CONVERSATION: Conversation = {
  id: 'conv-1',
  channel_type: 'manual',
  status: 'open',
  customer_id: 'cust-1',
  lead_id: null,
  opportunity_id: null,
  context: {
    customer_name: 'Ana Cliente',
    lead_name: null,
    lead_status: null,
    opportunity_status: null,
  },
  assigned_to: null,
  assigned_at: null,
  closed_at: null,
  closed_by: null,
  last_message_at: '2026-10-07T12:00:00Z',
  created_at: '2026-10-07T10:00:00Z',
  updated_at: '2026-10-07T12:00:00Z',
};

export function message(id: string, createdAt: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    conversation_id: 'conv-1',
    direction: null,
    sender_user_id: 'u-other',
    content: `texto ${id}`,
    created_at: createdAt,
    ...overrides,
  };
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

export function renderWithProviders(
  ui: ReactNode,
  permissions: string[],
  options: { route?: string; path?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthState = {
    status: 'authenticated',
    user: { id: 'u-me', name: 'Ana', email: 'ana@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (permission: string) => permissions.includes(permission),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[options.route ?? '/']}>
          <Routes>
            <Route path={options.path ?? '/'} element={ui} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
