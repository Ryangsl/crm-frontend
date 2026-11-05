import type { Branding, BrandingColors, BrandingTheme } from '../types/branding';

// Tema do tenant: a partir das 7 cores validadas pelo backend, deriva os tokens do design system. Unico
// ponto que escreve cor em tempo de execucao. Toda tinta e escolhida ou ajustada por contraste, entao
// nenhuma combinacao aceita deixa texto ilegivel.

// Cores padrao de cada tema, para preencher o formulario. A fonte e o backend (branding.ts), que valida.
export const DEFAULT_COLORS: Record<BrandingTheme, BrandingColors> = {
  light: {
    primary: '#0f62fe',
    secondary: '#64748b',
    button: '#0f62fe',
    sidebar: '#0b2545',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
  },
  dark: {
    primary: '#78a9ff',
    secondary: '#94a3b8',
    button: '#0f62fe',
    sidebar: '#0b1730',
    background: '#0b1220',
    surface: '#131c2e',
    text: '#e2e8f0',
  },
};

const WHITE = '#ffffff';
const INK_DARK = '#0f172a';
const AA_TEXT = 4.5;

function toRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

// `amount` = quanto de `b`: 0 devolve `a`, 1 devolve `b`.
export function mix(a: string, b: string, amount: number): string {
  const [ca, cb] = [toRgb(a), toRgb(b)];
  return toHex(ca.map((value, index) => value + (cb[index] - value) * amount));
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function bestInk(fill: string): string {
  return contrastRatio(fill, WHITE) >= contrastRatio(fill, INK_DARK) ? WHITE : INK_DARK;
}

// Afasta a cor do fundo ate atingir o contraste pedido, preservando o matiz.
export function ensureContrast(color: string, background: string, minimum: number): string {
  const target = luminance(background) > 0.4 ? '#000000' : WHITE;
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(color, target, step / 20);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
}

export function deriveThemeVars(colors: BrandingColors): Record<string, string> {
  const { primary, secondary, button, sidebar, background, surface, text } = colors;
  const isDark = luminance(surface) < 0.4;
  const toward = isDark ? WHITE : '#000000';
  const sidebarInk = bestInk(sidebar);
  const sidebarActive =
    contrastRatio(primary, sidebar) >= 1.5 ? primary : mix(sidebar, sidebarInk, 0.2);
  const success = isDark ? '#34d399' : '#047857';
  const warning = isDark ? '#fbbf24' : '#b45309';
  const danger = isDark ? '#f87171' : '#dc2626';

  return {
    '--color-brand-50': mix(primary, surface, 0.92),
    '--color-brand-100': mix(primary, surface, 0.84),
    '--color-brand-200': mix(primary, surface, 0.68),
    '--color-brand-300': mix(primary, surface, 0.5),
    '--color-brand-400': mix(primary, surface, 0.3),
    '--color-brand-500': mix(primary, surface, 0.12),
    '--color-brand-600': primary,
    '--color-brand-700': ensureContrast(mix(primary, toward, 0.15), surface, AA_TEXT),
    '--color-brand-800': ensureContrast(mix(primary, toward, 0.35), surface, AA_TEXT),
    '--color-brand-900': ensureContrast(mix(primary, toward, 0.5), surface, AA_TEXT),

    '--color-button': button,
    '--color-button-hover': mix(button, bestInk(button) === WHITE ? '#000000' : WHITE, 0.15),
    '--color-on-button': bestInk(button),

    '--color-sidebar': sidebar,
    '--color-sidebar-ink': sidebarInk,
    '--color-sidebar-muted': ensureContrast(mix(sidebarInk, sidebar, 0.25), sidebar, AA_TEXT),
    '--color-sidebar-hover': mix(sidebar, sidebarInk, 0.1),
    '--color-sidebar-active': sidebarActive,
    '--color-on-sidebar-active': bestInk(sidebarActive),
    '--color-sidebar-border': mix(sidebar, sidebarInk, 0.16),

    '--color-background': background,
    '--color-surface': surface,
    '--color-surface-muted': mix(surface, text, 0.05),
    '--color-border-subtle': mix(surface, text, 0.12),
    '--color-border-strong': mix(surface, text, 0.24),

    '--color-neutral-50': mix(surface, text, 0.03),
    '--color-neutral-100': mix(surface, text, 0.07),
    '--color-neutral-200': mix(surface, text, 0.14),
    '--color-neutral-300': mix(surface, text, 0.26),
    '--color-neutral-400': mix(surface, secondary, 0.7),
    '--color-neutral-500': secondary,
    '--color-neutral-600': mix(secondary, text, 0.4),
    '--color-neutral-700': mix(secondary, text, 0.65),
    '--color-neutral-800': mix(secondary, text, 0.85),
    '--color-neutral-900': text,
    '--color-neutral-950': text,

    '--color-success': success,
    '--color-success-soft': mix(surface, success, 0.1),
    '--color-warning': warning,
    '--color-warning-soft': mix(surface, warning, 0.1),
    '--color-danger': danger,
    '--color-danger-soft': mix(surface, danger, 0.1),
    '--color-info-soft': mix(surface, primary, 0.1),
  };
}

const THEME_VAR_NAMES = Object.keys(
  deriveThemeVars({
    primary: WHITE,
    secondary: WHITE,
    button: WHITE,
    sidebar: WHITE,
    background: WHITE,
    surface: WHITE,
    text: WHITE,
  }),
);

function setThemeColorMeta(color: string | null): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', color ?? meta.getAttribute('data-default') ?? '');
}

export function resetBranding(root: HTMLElement = document.documentElement): void {
  for (const name of THEME_VAR_NAMES) root.style.removeProperty(name);
  root.removeAttribute('data-theme');
  root.style.removeProperty('color-scheme');
  setThemeColorMeta(null);
}

// Identidade padrao nao escreve nada: valem os tokens do CSS. Assim, sair da sessao ou trocar de tenant
// e sempre voltar ao mesmo estado limpo.
export function applyBranding(
  branding: Branding | null | undefined,
  root: HTMLElement = document.documentElement,
): void {
  resetBranding(root);
  if (!branding || branding.is_default) return;
  for (const [name, value] of Object.entries(deriveThemeVars(branding.colors))) {
    root.style.setProperty(name, value);
  }
  root.setAttribute('data-theme', branding.theme);
  root.style.setProperty('color-scheme', branding.theme);
  setThemeColorMeta(branding.colors.sidebar);
}
