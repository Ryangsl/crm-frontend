import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { login } from './support/session';

// Fluxo comercial de ponta a ponta contra a API real: Lead -> qualificado -> Cliente -> Oportunidade ->
// ganha. Os dados levam um sufixo unico por execucao, entao a suite pode repetir no mesmo banco.
test.describe.configure({ mode: 'serial' });

const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
const LEAD_NAME = `Lead E2E ${RUN}`;
// Telefone celular valido e diferente a cada execucao (evita aviso de duplicidade na conversao).
const PHONE = `119${String(Date.now()).slice(-8)}`;

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await login(page);
});

test.afterAll(async () => {
  await page.close();
});

test('cadastra um lead com nome, telefone e origem', async () => {
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Leads' })
    .click();
  await page.getByRole('button', { name: 'Novo lead' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Novo lead' })).toBeVisible();

  await page.getByLabel('Nome').fill(LEAD_NAME);
  await page.getByLabel('Telefone').fill(PHONE);
  const source = page.getByLabel('Origem');
  // Primeira origem real do cadastro inicial da empresa (D-094), sem depender do nome dela.
  const firstSource = source.locator('option:not([value=""])').first();
  await source.selectOption((await firstSource.getAttribute('value')) ?? '');
  await page.getByRole('button', { name: 'Criar lead' }).click();

  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: LEAD_NAME })).toBeVisible();
});

test('qualifica o lead', async () => {
  await page.getByRole('button', { name: 'Qualificar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Qualificar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main').getByText('Qualificado').first()).toBeVisible();
});

test('converte o lead criando um cliente', async () => {
  await page.getByRole('button', { name: 'Converter', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  // O formulario de conversao vem preenchido com os dados do lead (o telefone ja em E.164); o cliente
  // e criado com eles, sem digitar de novo.
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Novo cliente' }) });
  await expect(form.getByLabel('Nome')).toHaveValue(LEAD_NAME);
  await expect(form.getByLabel('Telefone')).toHaveValue(`+55${PHONE}`);
  await expect(form.getByLabel('E-mail')).toHaveValue('');
  await form.getByRole('button', { name: 'Converter', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Criar oportunidade' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Convertido').first()).toBeVisible();
});

test('o cliente criado aparece na lista de clientes', async () => {
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Clientes' })
    .click();
  await page.getByLabel(/Buscar/).fill(LEAD_NAME);
  await expect(page.getByRole('link', { name: LEAD_NAME }).first()).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Criar oportunidade' })).toBeVisible();
});

test('cria uma oportunidade para o cliente', async () => {
  await page.getByRole('button', { name: 'Criar oportunidade' }).click();
  await expect(page).toHaveURL(/\/opportunities\/new\?/);
  await page.getByLabel('Valor').fill('1500');
  await page.getByRole('button', { name: 'Criar oportunidade' }).click();

  await expect(page).toHaveURL(/\/opportunities\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: LEAD_NAME })).toBeVisible();
  await expect(page.getByRole('main').getByText('Aberta').first()).toBeVisible();
});

test('ganha a oportunidade e a tela mostra o estado "Ganha"', async () => {
  await page.getByRole('button', { name: 'Ganhar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar ganho' }).click();

  await expect(page.getByRole('button', { name: 'Ganhar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main').getByText('Ganha', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Oportunidade encerrada')).toBeVisible();

  // O estado e do servidor, nao so da tela: continua "Ganha" depois de recarregar.
  await page.reload();
  await expect(page.getByRole('main').getByText('Ganha', { exact: true }).first()).toBeVisible();
});
