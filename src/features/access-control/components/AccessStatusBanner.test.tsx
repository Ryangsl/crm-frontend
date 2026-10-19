import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccessStatusBanner } from './AccessStatusBanner';
import * as service from '../services/accessControl';
import type { AccessStatus } from '../types/accessControl';

vi.mock('../services/accessControl');

const BASE: AccessStatus = {
  restriction_enabled: true,
  applies_to_me: true,
  within_business_hours: false,
  access: { leads: false, conversations: false },
};

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AccessStatusBanner />
    </QueryClientProvider>,
  );
}

describe('AccessStatusBanner (F4.7)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('restringido fora do horario: avisa e cita Leads e Conversas', async () => {
    vi.mocked(service.getAccessStatus).mockResolvedValue(BASE);
    renderBanner();
    const banner = await screen.findByTestId('access-status-banner');
    expect(banner).toHaveTextContent('Fora do horario de funcionamento');
    expect(banner).toHaveTextContent('Leads e Conversas');
    expect(banner).toHaveTextContent(/liberacao excepcional/i);
  });

  it('com excecao so de leads: o aviso cita apenas Conversas', async () => {
    vi.mocked(service.getAccessStatus).mockResolvedValue({
      ...BASE,
      access: { leads: true, conversations: false },
    });
    renderBanner();
    const banner = await screen.findByTestId('access-status-banner');
    expect(banner).toHaveTextContent('Conversas');
    expect(banner).not.toHaveTextContent('Leads');
  });

  it.each([
    ['restricao desligada', { ...BASE, restriction_enabled: false, within_business_hours: null }],
    ['isento (nao se aplica a mim)', { ...BASE, applies_to_me: false }],
    [
      'dentro do horario',
      { ...BASE, within_business_hours: true, access: { leads: true, conversations: true } },
    ],
    ['liberado em tudo por excecao', { ...BASE, access: { leads: true, conversations: true } }],
  ] as const)('nao mostra o aviso: %s', async (_label, status) => {
    vi.mocked(service.getAccessStatus).mockResolvedValue(status);
    renderBanner();
    await waitFor(() => expect(service.getAccessStatus).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId('access-status-banner')).not.toBeInTheDocument();
  });

  it('falha ao consultar o status nunca mostra aviso nem quebra', async () => {
    vi.mocked(service.getAccessStatus).mockRejectedValue(new Error('rede'));
    renderBanner();
    await waitFor(() => expect(service.getAccessStatus).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId('access-status-banner')).not.toBeInTheDocument();
  });
});
