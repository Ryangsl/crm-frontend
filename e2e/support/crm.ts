import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Registros de apoio para as telas de detalhe: criados pela propria interface, uma vez por processo de
// teste, para o spec de acessibilidade nao depender de dados previos nem da ordem dos arquivos.
export interface SampleRecords {
  leadPath: string;
  customerPath: string;
  opportunityPath: string;
}

let sample: SampleRecords | null = null;

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function uniquePhone(): string {
  return `119${String(Date.now() + Math.floor(Math.random() * 1000)).slice(-8)}`;
}

export async function createLead(page: Page, name: string, phone: string): Promise<string> {
  await page.goto('/leads/new');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('Telefone').fill(phone);
  const source = page.getByLabel('Origem');
  // Primeira origem real do cadastro inicial da empresa (D-094), sem depender do nome dela.
  const firstSource = source.locator('option:not([value=""])').first();
  await source.selectOption((await firstSource.getAttribute('value')) ?? '');
  await page.getByRole('button', { name: 'Criar lead' }).click();
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

export async function ensureSampleRecords(page: Page): Promise<SampleRecords> {
  if (sample) return sample;
  const suffix = uniqueSuffix();

  // Um lead que vira cliente com oportunidade aberta...
  const customerName = `Cliente A11y ${suffix}`;
  await createLead(page, customerName, uniquePhone());
  await page.getByRole('button', { name: 'Converter', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Novo cliente' }) });
  await form.getByLabel('Nome').fill(customerName);
  await form.getByRole('button', { name: 'Converter', exact: true }).click();
  await page.getByRole('button', { name: 'Criar oportunidade' }).click();
  await expect(page).toHaveURL(/\/opportunities\/new\?/);
  const customerId = new URL(page.url()).searchParams.get('customer_id');
  await page.getByLabel('Valor').fill('900');
  await page.getByRole('button', { name: 'Criar oportunidade' }).click();
  await expect(page).toHaveURL(/\/opportunities\/[0-9a-f-]{36}$/);
  const opportunityPath = new URL(page.url()).pathname;

  // ...um lead desqualificado, para as listas mostrarem tambem o selo de estado negativo...
  await createLead(page, `Lead A11y desqualificado ${suffix}`, uniquePhone());
  await page.getByRole('button', { name: 'Desqualificar' }).click();
  const reason = page.getByLabel('Motivo da desqualificação');
  // Primeiro motivo da lista da empresa (D-099); "Outro" exigiria justificativa.
  await reason.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('button', { name: 'Reabrir' })).toBeVisible();

  // ...e um lead novo, ainda com todas as acoes disponiveis.
  const leadPath = await createLead(page, `Lead A11y ${suffix}`, uniquePhone());

  sample = { leadPath, customerPath: `/customers/${customerId}`, opportunityPath };
  return sample;
}
