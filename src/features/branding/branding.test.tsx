import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import { BrandingApplier } from './components/BrandingApplier';
import { applyBranding, bestInk, contrastRatio, deriveThemeVars, resetBranding } from './lib/theme';
import * as service from './services/branding';
import type { Branding, BrandingColors } from './types/branding';

vi.mock('./services/branding');

const root = document.documentElement;
const var_ = (name: string) => root.style.getPropertyValue(name);

const LIGHT: BrandingColors = {
  primary: '#047857',
  secondary: '#64748b',
  button: '#047857',
  sidebar: '#064e3b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
};
const DARK: BrandingColors = {
  primary: '#78a9ff',
  secondary: '#94a3b8',
  button: '#0f62fe',
  sidebar: '#0b1730',
  background: '#0b1220',
  surface: '#131c2e',
  text: '#e2e8f0',
};

function branding(overrides: Partial<Branding> = {}): Branding {
  return {
    display_name: 'Empresa A',
    theme: 'light',
    colors: LIGHT,
    logo_url: null,
    favicon_url: null,
    is_default: false,
    updated_at: '2026-11-05T12:00:00.000Z',
    ...overrides,
  };
}

function renderApplier(user: AuthState['user']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth = {
    status: 'authenticated',
    user,
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: () => false,
  } as AuthState;
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <BrandingApplier />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

const USER: NonNullable<AuthState['user']> = {
  id: 'u1',
  name: 'Ana',
  email: 'a@x.com',
  status: 'active',
  permissions: [],
};

afterEach(() => {
  cleanup();
  resetBranding();
  vi.restoreAllMocks();
});

describe('deriveThemeVars', () => {
  it('a tinta do botao e da barra lateral acompanha a cor escolhida', () => {
    expect(bestInk('#0f62fe')).toBe('#ffffff');
    expect(bestInk('#d4af37')).toBe('#0f172a');
    const vars = deriveThemeVars({ ...LIGHT, button: '#d4af37', sidebar: '#27272a' });
    expect(vars['--color-on-button']).toBe('#0f172a');
    expect(vars['--color-sidebar-ink']).toBe('#ffffff');
  });

  it.each([
    ['claro', LIGHT],
    ['escuro', DARK],
    ['claro com primaria no limite', { ...LIGHT, primary: '#8a8a8a' }],
    ['dourado', { ...LIGHT, primary: '#92700c', button: '#d4af37', sidebar: '#27272a' }],
  ])('tokens de texto ficam em AA: %s', (_name, colors) => {
    const vars = deriveThemeVars(colors);
    const surface = vars['--color-surface'];
    expect(contrastRatio(vars['--color-brand-700'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--color-neutral-900'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--color-neutral-500'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--color-on-button'], vars['--color-button'])).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrastRatio(vars['--color-sidebar-ink'], vars['--color-sidebar']),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(vars['--color-sidebar-muted'], vars['--color-sidebar']),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(vars['--color-on-sidebar-active'], vars['--color-sidebar-active']),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--color-success'], surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars['--color-danger'], surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('applyBranding', () => {
  it('identidade padrao nao escreve nenhuma variavel: valem os tokens do CSS', () => {
    applyBranding(branding({ is_default: true }));

    expect(root.getAttribute('style') ?? '').not.toContain('--color');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('identidade personalizada aplica as variaveis e o tema', () => {
    applyBranding(branding());

    expect(var_('--color-brand-600')).toBe('#047857');
    expect(var_('--color-sidebar')).toBe('#064e3b');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('trocar de identidade nao deixa sobra da anterior', () => {
    applyBranding(branding({ theme: 'dark', colors: DARK }));
    expect(root.getAttribute('data-theme')).toBe('dark');

    applyBranding(branding({ is_default: true }));

    expect(var_('--color-brand-600')).toBe('');
    expect(var_('--color-surface')).toBe('');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('sem dado volta ao padrao', () => {
    applyBranding(branding());

    applyBranding(null);

    expect(var_('--color-brand-600')).toBe('');
  });
});

describe('BrandingApplier', () => {
  it('tenant sem personalizacao fica com o tema padrao', async () => {
    vi.mocked(service.getBranding).mockResolvedValue(branding({ is_default: true }));
    renderApplier(USER);

    await waitFor(() => expect(service.getBranding).toHaveBeenCalled());
    expect(var_('--color-brand-600')).toBe('');
  });

  it('tenant personalizado recebe as proprias cores', async () => {
    vi.mocked(service.getBranding).mockResolvedValue(branding());
    renderApplier(USER);

    await waitFor(() => expect(var_('--color-brand-600')).toBe('#047857'));
  });

  it('API indisponivel: interface segue com o padrao', async () => {
    vi.mocked(service.getBranding).mockRejectedValue(new Error('x'));
    renderApplier(USER);

    await waitFor(() => expect(service.getBranding).toHaveBeenCalled());
    expect(var_('--color-brand-600')).toBe('');
  });

  it('fim da sessao limpa as cores: a proxima sessao nao herda nada', async () => {
    vi.mocked(service.getBranding).mockResolvedValue(branding());
    const first = renderApplier(USER);
    await waitFor(() => expect(var_('--color-brand-600')).toBe('#047857'));

    first.unmount();
    expect(var_('--color-brand-600')).toBe('');
    expect(root.hasAttribute('data-theme')).toBe(false);

    vi.mocked(service.getBranding).mockResolvedValue(branding({ is_default: true }));
    renderApplier({ ...USER, id: 'u2' });
    await waitFor(() => expect(service.getBranding).toHaveBeenCalledTimes(2));
    expect(var_('--color-brand-600')).toBe('');
  });

  it('sem usuario nao consulta', () => {
    renderApplier(null);

    expect(service.getBranding).not.toHaveBeenCalled();
  });
});
