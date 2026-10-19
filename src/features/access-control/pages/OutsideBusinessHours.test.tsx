import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConversationDetailPage } from '@/features/conversations/pages/ConversationDetailPage';
import { ConversationListPage } from '@/features/conversations/pages/ConversationListPage';
import { EntityConversationsSection } from '@/features/conversations/components/EntityConversationsSection';
import * as conversationsService from '@/features/conversations/services/conversations';
import { renderWithProviders } from '@/features/conversations/testing';
import { LeadDetailPage } from '@/features/leads/pages/LeadDetailPage';
import { LeadListPage } from '@/features/leads/pages/LeadListPage';
import * as leadsService from '@/features/leads/services/leads';
import { ApiError } from '@/services/api';

vi.mock('@/features/conversations/services/conversations');
vi.mock('@/features/leads/services/leads');

// 403 OUTSIDE_BUSINESS_HOURS (D-082) nas telas de Leads e Conversas: mensagem propria, sem o
// botao "Tentar novamente" (repetir nao muda o resultado) e sem o texto generico de erro.
const OUTSIDE = () =>
  new ApiError(403, 'OUTSIDE_BUSINESS_HOURS', 'Acesso indisponivel fora do horario.');

describe('403 OUTSIDE_BUSINESS_HOURS nas telas cobertas (F4.7)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  async function expectOutsideNotice() {
    expect(await screen.findByText('Fora do horario de funcionamento')).toBeInTheDocument();
    expect(screen.getByText(/liberacao excepcional a um Admin ou Gerente/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  }

  it('lista de Leads', async () => {
    vi.mocked(leadsService.listLeads).mockRejectedValue(OUTSIDE());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
    renderWithProviders(<LeadListPage />, ['leads:read'], { route: '/leads', path: '/leads' });
    await expectOutsideNotice();
    expect(screen.queryByText('Nao foi possivel carregar os leads')).not.toBeInTheDocument();
  });

  it('detalhe de Lead', async () => {
    vi.mocked(leadsService.getLead).mockRejectedValue(OUTSIDE());
    vi.mocked(leadsService.listLeadSources).mockResolvedValue({
      data: [],
      page: 1,
      limit: 100,
      total: 0,
    });
    renderWithProviders(<LeadDetailPage />, ['leads:read'], {
      route: '/leads/l1',
      path: '/leads/:id',
    });
    await expectOutsideNotice();
    expect(screen.queryByText('Nao foi possivel carregar o lead')).not.toBeInTheDocument();
  });

  it('lista de Conversas', async () => {
    vi.mocked(conversationsService.listConversations).mockRejectedValue(OUTSIDE());
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    await expectOutsideNotice();
  });

  it('detalhe de Conversa (com link de volta)', async () => {
    vi.mocked(conversationsService.getConversation).mockRejectedValue(OUTSIDE());
    vi.mocked(conversationsService.listMessages).mockRejectedValue(OUTSIDE());
    renderWithProviders(<ConversationDetailPage />, ['conversations:read'], {
      route: '/conversations/c1',
      path: '/conversations/:id',
    });
    await expectOutsideNotice();
    expect(screen.getByRole('link', { name: /voltar para conversas/i })).toBeInTheDocument();
  });

  it('secao "Conversas" dos detalhes de Cliente, Lead e Oportunidade', async () => {
    vi.mocked(conversationsService.listConversations).mockRejectedValue(OUTSIDE());
    renderWithProviders(<EntityConversationsSection entityType="customer" entityId="c1" />, [
      'conversations:read',
    ]);
    await expectOutsideNotice();
  });

  it('um erro que nao e o de horario continua usando a mensagem generica e a nova tentativa', async () => {
    vi.mocked(conversationsService.listConversations).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'sem permissao'),
    );
    renderWithProviders(<ConversationListPage />, ['conversations:read']);
    await waitFor(() =>
      expect(screen.getByText('Nao foi possivel carregar as conversas')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Fora do horario de funcionamento')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
