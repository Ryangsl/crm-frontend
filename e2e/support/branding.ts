import type { BrowserContext } from '@playwright/test';

// Identidade visual nos testes (D-086). Aplicar uma identidade de verdade exige `branding:manage`, que e
// reservada a plataforma; por isso o teste responde ele mesmo ao GET /v1/branding. O caminho exercitado
// e o real do frontend: useBrandingQuery -> BrandingApplier -> deriveThemeVars -> tokens CSS. O que NAO e
// exercitado: a gravacao e a validacao da identidade no backend (cobertas pelos e2e da API).
export interface BrandingFixture {
  theme: 'light' | 'dark';
  colors: Record<
    'primary' | 'secondary' | 'button' | 'sidebar' | 'background' | 'surface' | 'text',
    string
  >;
}

// Cores padrao do tema escuro, iguais as do backend (DEFAULT_BRANDING_COLORS.dark).
export const DARK_THEME: BrandingFixture = {
  theme: 'dark',
  colors: {
    primary: '#78a9ff',
    secondary: '#94a3b8',
    button: '#0f62fe',
    sidebar: '#0b1730',
    background: '#0b1220',
    surface: '#131c2e',
    text: '#e2e8f0',
  },
};

// Identidades personalizadas (uma clara e uma escura), com marca fora do azul padrao. As duas foram
// conferidas contra a validacao do backend (validateContrast em tenant-settings/branding.ts): aceitas.
// Se o teste ganhar outra paleta, confira-a la tambem: paleta que o backend recusa nao e um caso real.
export const CUSTOM_IDENTITY: BrandingFixture = {
  theme: 'light',
  colors: {
    primary: '#7c3aed',
    secondary: '#6b7280',
    button: '#7c3aed',
    sidebar: '#2e1065',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#1e1b4b',
  },
};

// Identidade personalizada escura: marca quente sobre fundo escuro.
export const CUSTOM_DARK_IDENTITY: BrandingFixture = {
  theme: 'dark',
  colors: {
    primary: '#f59e0b',
    secondary: '#a8a29e',
    button: '#b45309',
    sidebar: '#1c1917',
    background: '#0c0a09',
    surface: '#1c1917',
    text: '#f5f5f4',
  },
};

// Responde GET /v1/branding com a identidade pedida, no formato do contrato. Outros metodos passam direto.
export async function stubBranding(
  context: BrowserContext,
  fixture: BrandingFixture,
): Promise<void> {
  await context.route('**/v1/branding', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        display_name: 'Empresa Exemplo',
        theme: fixture.theme,
        colors: fixture.colors,
        logo_url: null,
        favicon_url: null,
        is_default: false,
        updated_at: '2026-01-01T00:00:00.000Z',
      }),
    });
  });
}
