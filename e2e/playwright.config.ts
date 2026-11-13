import { defineConfig, devices } from '@playwright/test';

// E2E de navegador (D-020). Precisa do backend real (Postgres + Redis + seed) e do frontend servido na
// mesma origem, com /v1 encaminhado ao backend sem trocar o Host (D-088): o endereco identifica a empresa.
//
//   E2E_BASE_URL       endereco aberto no navegador (padrao: empresa do seed).
//   E2E_WEB_SERVER=1   sobe o Vite pelo proprio Playwright; sem isso, espera-se o frontend ja no ar.
//   E2E_USER_EMAIL / E2E_USER_PASSWORD   credenciais ficticias do seed.
const baseURL = process.env.E2E_BASE_URL ?? 'http://exemplo.localhost:5173';

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  // Um worker: os specs compartilham a mesma conta e o backend limita logins por conta e por endereco.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]]
    : [['list']],
  use: {
    baseURL,
    locale: 'pt-BR',
    // Sem animacao: o axe le as cores finais, nao um quadro de transicao.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_WEB_SERVER
    ? {
        command: 'npx vite --port 5173 --strictPort',
        cwd: '..',
        // O Node pode nao resolver subdominios de localhost; a espera usa o endereco direto.
        url: process.env.E2E_WEB_SERVER_URL ?? 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
