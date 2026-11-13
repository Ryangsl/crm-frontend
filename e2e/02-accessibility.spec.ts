import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectVisibleFocus,
} from './support/a11y';
import {
  CUSTOM_DARK_IDENTITY,
  CUSTOM_IDENTITY,
  DARK_THEME,
  stubBranding,
} from './support/branding';
import type { BrandingFixture } from './support/branding';
import { ensureSampleRecords } from './support/crm';
import type { SampleRecords } from './support/crm';
import { login, openScreen, settle } from './support/session';

// Acessibilidade: axe (WCAG 2 A e AA) em cada tela, nas identidades visuais da empresa (D-086), e
// verificacoes objetivas de teclado, foco e largura de celular. Cada grupo entra uma vez e reutiliza a
// pagina; os testes sao independentes entre si (uma falha nao impede os demais).

interface Screen {
  name: string;
  path: string | ((records: SampleRecords) => string);
}

const SCREENS: Screen[] = [
  { name: 'inicio', path: '/' },
  { name: 'leads: lista', path: '/leads' },
  { name: 'leads: novo', path: '/leads/new' },
  { name: 'leads: detalhe', path: (records) => records.leadPath },
  { name: 'clientes: lista', path: '/customers' },
  { name: 'clientes: detalhe', path: (records) => records.customerPath },
  { name: 'oportunidades: lista', path: '/opportunities' },
  { name: 'oportunidades: detalhe', path: (records) => records.opportunityPath },
  { name: 'pipeline', path: '/pipeline' },
  { name: 'follow-ups', path: '/follow-ups' },
  { name: 'conversas', path: '/conversations' },
  { name: 'configuracoes', path: '/settings' },
  { name: 'usuarios', path: '/settings/users' },
  { name: 'plano', path: '/plan' },
  { name: 'minha conta', path: '/account' },
];

const IDENTITIES: { name: string; branding: BrandingFixture | null; theme: string | null }[] = [
  { name: 'tema claro padrao', branding: null, theme: null },
  { name: 'tema escuro', branding: DARK_THEME, theme: 'dark' },
  { name: 'identidade personalizada clara', branding: CUSTOM_IDENTITY, theme: 'light' },
  { name: 'identidade personalizada escura', branding: CUSTOM_DARK_IDENTITY, theme: 'dark' },
];

async function resolvePath(page: Page, screen: Screen): Promise<string> {
  return typeof screen.path === 'string'
    ? screen.path
    : screen.path(await ensureSampleRecords(page));
}

// A identidade da empresa so vale depois do login (o BrandingApplier fica no AppShell): a tela de login
// usa sempre a identidade padrao.
test.describe('tela de login', () => {
  test('axe: login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('foco visivel ao tabular no login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').focus();
    await expectVisibleFocus(page, 'campo E-mail');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Senha')).toBeFocused();
    await expectVisibleFocus(page, 'campo Senha');
    // O botao pode vir depois de outros controles (ex.: mostrar senha): tabula ate chegar nele.
    const submit = page.getByRole('button', { name: 'Entrar' });
    for (
      let step = 0;
      step < 4 && !(await submit.evaluate((el) => el === document.activeElement));
      step += 1
    ) {
      await page.keyboard.press('Tab');
    }
    await expect(submit).toBeFocused();
    await expectVisibleFocus(page, 'botao Entrar');
  });

  test('login em 390 px sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

for (const identity of IDENTITIES) {
  test.describe(identity.name, () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      if (identity.branding) await stubBranding(context, identity.branding);
      page = await context.newPage();
      await login(page);
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    test('a identidade esta aplicada', async () => {
      await openScreen(page, '/');
      const root = page.locator('html');
      if (identity.theme) await expect(root).toHaveAttribute('data-theme', identity.theme);
      else await expect(root).not.toHaveAttribute('data-theme', /.*/);
    });

    for (const screen of SCREENS) {
      test(`axe: ${screen.name}`, async () => {
        await openScreen(page, await resolvePath(page, screen));
        await expectNoAxeViolations(page);
      });
    }

    test('foco visivel ao tabular no formulario de lead', async () => {
      await openScreen(page, '/leads/new');
      await page.getByLabel('Nome').focus();
      await expectVisibleFocus(page, 'campo Nome');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Telefone')).toBeFocused();
      await expectVisibleFocus(page, 'campo Telefone');
      await page.getByLabel('Origem').focus();
      await expectVisibleFocus(page, 'seletor Origem');
      await page.getByRole('button', { name: 'Cancelar' }).focus();
      await expectVisibleFocus(page, 'botao Cancelar');
      await page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('link', { name: 'Leads' })
        .focus();
      await expectVisibleFocus(page, 'item do menu');
    });

    test('axe: dialogo aberto (novo usuario)', async () => {
      await openScreen(page, '/settings/users');
      await page.getByRole('button', { name: 'Novo usuário' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  });
}

test.describe('teclado e largura de celular', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('dialogo: foco entra e fica dentro, Esc fecha e o foco volta ao botao', async () => {
    await openScreen(page, '/settings/users');
    const trigger = page.getByRole('button', { name: 'Novo usuário' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    // Tab e Shift+Tab dao a volta dentro do dialogo, sem escapar para a pagina atras.
    for (const key of ['Tab', 'Shift+Tab', 'Shift+Tab', 'Tab', 'Tab']) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('menu lateral navegavel por teclado', async () => {
    await openScreen(page, '/');
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await menu.getByRole('link', { name: 'Início' }).focus();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Leads' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Clientes' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/customers$/);
    await expect(menu.getByRole('link', { name: 'Clientes' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test.describe('390 px', () => {
    test.beforeAll(async () => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    const MOBILE_SCREENS = SCREENS.filter((screen) =>
      [
        'inicio',
        'leads: lista',
        'leads: novo',
        'leads: detalhe',
        'clientes: lista',
        'clientes: detalhe',
        'oportunidades: lista',
        'oportunidades: detalhe',
        'pipeline',
        'follow-ups',
        'conversas',
        'configuracoes',
      ].includes(screen.name),
    );

    for (const screen of MOBILE_SCREENS) {
      test(`sem rolagem horizontal: ${screen.name}`, async () => {
        await openScreen(page, await resolvePath(page, screen));
        await expectNoHorizontalScroll(page);
      });
    }

    test('menu "Mais": abre pelo teclado, Esc fecha e o foco volta', async () => {
      await openScreen(page, '/');
      const more = page
        .getByRole('navigation', { name: 'Atalhos' })
        .getByRole('button', { name: 'Mais' });
      await more.focus();
      await expectVisibleFocus(page, 'botao Mais');
      await page.keyboard.press('Enter');
      const drawer = page.getByRole('dialog', { name: 'Menu' });
      await expect(drawer).toBeVisible();
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(drawer).toHaveCount(0);
      await expect(more).toBeFocused();
      await settle(page);
    });
  });
});
