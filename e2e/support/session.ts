import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@exemplo.crm.local';
export const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin123!';

// Login pela tela, como um usuario. O access token fica em memoria e o refresh em cookie httpOnly com
// rotacao (ADR-008): por isso cada grupo de testes entra uma vez e reutiliza a mesma pagina, em vez de
// copiar o estado da sessao entre contextos (reapresentar um refresh ja rotacionado encerra a sessao).
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(USER_EMAIL);
  await page.getByLabel('Senha').fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

// Vai para uma rota e espera a tela assentar: titulo visivel e nenhum indicador de carregamento.
export async function openScreen(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await settle(page);
}

export async function settle(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('status', { name: /^Carregando/ })).toHaveCount(0);
}
