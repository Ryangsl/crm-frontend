import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WriteAccessContext } from '@/components/ui/write-access';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { ApiError } from '@/services/api';
import { DEFAULT_COLORS } from '../lib/theme';
import * as service from '../services/branding';
import type { Branding } from '../types/branding';
import { BrandIdentityPage } from './BrandIdentityPage';

vi.mock('../services/branding');

const DEFAULT: Branding = {
  display_name: 'Empresa Exemplo',
  theme: 'light',
  colors: DEFAULT_COLORS.light,
  logo_url: null,
  favicon_url: null,
  is_default: true,
  updated_at: null,
};

const PLATFORM = ['branding:manage', 'branding:read'];
const TENANT_ADMIN = ['branding:read', 'branding:request'];
const DIRECTOR = ['branding:read'];

function renderPage(permissions = PLATFORM, writeBlock: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'a@x.com', status: 'active', permissions },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key: string) => permissions.includes(key),
  };
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <WriteAccessContext.Provider value={writeBlock}>
          <MemoryRouter>
            <BrandIdentityPage />
          </MemoryRouter>
        </WriteAccessContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(service.getBranding).mockResolvedValue(DEFAULT);
  vi.mocked(service.getBrandingRequest).mockResolvedValue({ pending: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Identidade Visual', () => {
  it('sem permissao nao mostra o formulario nem consulta', () => {
    renderPage([]);

    expect(screen.getByText(/não tem permissão para ver a identidade/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument();
    expect(service.getBranding).not.toHaveBeenCalled();
  });

  it('carrega os valores atuais', async () => {
    renderPage();

    expect(await screen.findByLabelText('Nome de exibição')).toHaveValue('Empresa Exemplo');
    expect(screen.getByLabelText('Cor primária')).toHaveValue('#0f62fe');
    expect(screen.getByLabelText('Claro')).toBeChecked();
  });

  it('a pre-visualizacao muda antes de salvar e nao toca no resto da aplicacao', async () => {
    renderPage();
    const field = await screen.findByLabelText('Barra lateral');

    fireEvent.change(field, { target: { value: '#064e3b' } });

    const preview = screen.getByTestId('brand-preview');
    expect(preview.style.getPropertyValue('--color-sidebar')).toBe('#064e3b');
    expect(document.documentElement.style.getPropertyValue('--color-sidebar')).toBe('');
    expect(service.updateBranding).not.toHaveBeenCalled();
  });

  it('cor incompleta nao quebra a pre-visualizacao', async () => {
    renderPage();
    const field = await screen.findByLabelText('Cor primária');

    fireEvent.change(field, { target: { value: '#0f' } });

    expect(screen.getByText('Informe cores no formato #RRGGBB.')).toBeInTheDocument();
  });

  it('trocar o tema preenche as cores daquele tema', async () => {
    renderPage();
    await screen.findByLabelText('Escuro');

    fireEvent.click(screen.getByLabelText('Escuro'));

    expect(screen.getByLabelText('Fundo')).toHaveValue(DEFAULT_COLORS.dark.background);
  });

  it('salva nome, tema e cores e confirma', async () => {
    vi.mocked(service.updateBranding).mockResolvedValue({ ...DEFAULT, is_default: false });
    renderPage();
    const name = await screen.findByLabelText('Nome de exibição');

    fireEvent.change(name, { target: { value: 'Empresa Verde' } });
    fireEvent.change(screen.getByLabelText('Cor primária'), { target: { value: '#047857' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() =>
      expect(service.updateBranding).toHaveBeenCalledWith({
        display_name: 'Empresa Verde',
        theme: 'light',
        colors: { ...DEFAULT_COLORS.light, primary: '#047857' },
      }),
    );
    expect(await screen.findByText('Identidade visual salva.')).toBeInTheDocument();
  });

  it('valor recusado pelo backend mostra o campo e o motivo', async () => {
    vi.mocked(service.updateBranding).mockRejectedValue(
      new ApiError(422, 'BRANDING_INVALID', 'm', [
        { field: 'colors.text', issue: 'contraste 1.20:1 com o fundo; minimo 4.5:1' },
      ]),
    );
    renderPage();
    await screen.findByLabelText('Texto');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/colors\.text: contraste/)).toBeInTheDocument();
  });

  it('restaurar pede confirmacao', async () => {
    vi.mocked(service.getBranding).mockResolvedValue({ ...DEFAULT, is_default: false });
    vi.mocked(service.resetBrandingToDefault).mockResolvedValue();
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Restaurar padrão/ }));
    expect(service.resetBrandingToDefault).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(service.resetBrandingToDefault).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Identidade padrão restaurada.')).toBeInTheDocument();
  });

  it('identidade padrao nao tem o que restaurar', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /Restaurar padrão/ })).toBeDisabled();
  });

  it('logotipo e favicon deixam claro que ainda nao estao disponiveis, sem campo de URL', async () => {
    renderPage();
    await screen.findByLabelText('Nome de exibição');

    expect(screen.getByText(/Ainda indisponíveis/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/URL/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('nao existe campo de CSS ou codigo', async () => {
    renderPage();
    await screen.findByLabelText('Nome de exibição');

    expect(document.querySelector('textarea')).toBeNull();
    expect(screen.queryByLabelText(/css/i)).not.toBeInTheDocument();
  });

  it('modo de consulta do Trial desabilita salvar', async () => {
    renderPage(PLATFORM, 'Indisponível: o período de avaliação terminou.');

    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  describe('servico administrado pela plataforma (D-086)', () => {
    it('Admin da empresa ve a identidade atual sem nenhum controle de edicao', async () => {
      renderPage(TENANT_ADMIN);

      expect(await screen.findByText('Identidade atual')).toBeInTheDocument();
      expect(screen.getByText(/configurada pela equipe do CRM Universal/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Restaurar padrão/ })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Cor primária')).not.toBeInTheDocument();
      expect(screen.getByTestId('brand-preview')).toBeInTheDocument();
    });

    it('Admin da empresa solicita a alteracao e acompanha', async () => {
      vi.mocked(service.createBrandingRequest).mockResolvedValue({
        pending: {
          message: 'Usar o verde da nossa marca.',
          requested_at: '2026-11-05T12:00:00.000Z',
          requested_by: { id: 'u1', name: 'Ana' },
        },
      });
      renderPage(TENANT_ADMIN);
      const field = await screen.findByLabelText('Descreva o que deseja alterar');
      expect(screen.getByRole('button', { name: /Enviar solicitação/ })).toBeDisabled();

      fireEvent.change(field, { target: { value: 'Usar o verde da nossa marca.' } });
      fireEvent.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

      await waitFor(() =>
        expect(service.createBrandingRequest).toHaveBeenCalledWith('Usar o verde da nossa marca.'),
      );
      expect(await screen.findByTestId('pending-request')).toHaveTextContent('por Ana');
      expect(
        screen.getByText('Solicitação enviada à equipe do CRM Universal.'),
      ).toBeInTheDocument();
      expect(service.updateBranding).not.toHaveBeenCalled();
    });

    it('recusa do backend aparece como orientacao, sem erro tecnico', async () => {
      vi.mocked(service.createBrandingRequest).mockRejectedValue(
        new ApiError(422, 'BRANDING_INVALID', 'm', [
          { field: 'message', issue: 'deve ter entre 10 e 1000 caracteres' },
        ]),
      );
      renderPage(TENANT_ADMIN);
      fireEvent.change(await screen.findByLabelText('Descreva o que deseja alterar'), {
        target: { value: 'Mensagem valida' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Enviar solicitação/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent('deve ter entre 10 e 1000');
    });

    it('Diretor so ve: nem editar, nem solicitar', async () => {
      vi.mocked(service.getBrandingRequest).mockResolvedValue({
        pending: {
          message: 'Pedido do admin.',
          requested_at: '2026-11-05T12:00:00.000Z',
          requested_by: { id: 'u2', name: 'Bruno' },
        },
      });
      renderPage(DIRECTOR);

      expect(await screen.findByText('Identidade atual')).toBeInTheDocument();
      expect(await screen.findByTestId('pending-request')).toHaveTextContent('Pedido do admin.');
      expect(screen.queryByLabelText(/Descreva o que deseja alterar/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Enviar solicitação/ })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Encerrar sem aplicar' }),
      ).not.toBeInTheDocument();
    });

    it('a plataforma ve a solicitacao pendente e pode encerra-la sem aplicar', async () => {
      vi.mocked(service.getBrandingRequest).mockResolvedValue({
        pending: {
          message: 'Pedido do admin.',
          requested_at: '2026-11-05T12:00:00.000Z',
          requested_by: { id: 'u2', name: 'Bruno' },
        },
      });
      vi.mocked(service.dismissBrandingRequest).mockResolvedValue();
      renderPage(PLATFORM);

      fireEvent.click(await screen.findByRole('button', { name: 'Encerrar sem aplicar' }));

      await waitFor(() => expect(service.dismissBrandingRequest).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Nenhuma solicitação em aberto.')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Descreva o que deseja alterar/)).not.toBeInTheDocument();
    });

    it('modo de consulta do Trial desabilita o envio da solicitacao', async () => {
      renderPage(TENANT_ADMIN, 'Indisponível: o período de avaliação terminou.');
      fireEvent.change(await screen.findByLabelText('Descreva o que deseja alterar'), {
        target: { value: 'Mensagem com tamanho suficiente' },
      });

      expect(screen.getByRole('button', { name: /Enviar solicitação/ })).toBeDisabled();
    });
  });
});
