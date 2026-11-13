import { render, screen } from '@testing-library/react';
import { close, createTransport, init } from '@sentry/react';
import type { ErrorEvent as SentryErrorEvent } from '@sentry/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../services/api';
import { AppErrorBoundary } from './ErrorScreen';
import { RouteErrorScreen } from './RouteErrorScreen';
import {
  initErrorMonitoring,
  isErrorMonitoringEnabled,
  readMonitoringConfig,
  reportError,
  resetErrorMonitoring,
  setMonitoringUser,
} from './monitoring';
import type { MonitoringConfig, Reporter } from './monitoring';
import { createSentryReporter, sentryOptions } from './sentry-reporter';
import { routeOf, shouldReport } from './report-filter';
import { scrubEvent } from './scrub-event';

// DSN de formato valido em dominio reservado (.invalid). Nenhum teste usa a rede: o reporter e falso
// ou o SDK real recebe um transporte em memoria.
const ENV = { VITE_SENTRY_DSN: 'https://chave@o0.ingest.invalid/1', MODE: 'test' };
const LEAD_ID = '0193a5b2-0000-7000-8000-000000000001';

function fakeReporter() {
  const reporter = { capture: vi.fn() } satisfies Reporter;
  return { reporter, load: vi.fn(async () => ({ createSentryReporter: () => reporter })) };
}

async function enable() {
  const fake = fakeReporter();
  await initErrorMonitoring(ENV, fake.load);
  return fake.reporter;
}

function Bomb(): never {
  throw new Error('falha de renderizacao');
}

beforeEach(() => {
  window.history.replaceState(
    null,
    '',
    `/leads/${LEAD_ID}?email=ana@exemplo.com#token=segredo-123`,
  );
});

afterEach(() => {
  resetErrorMonitoring();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('captura de erros desligada (D-101)', () => {
  it('sem DSN nao carrega o SDK, nao ouve a janela e nao reporta', async () => {
    const { reporter, load } = fakeReporter();
    const listen = vi.spyOn(window, 'addEventListener');

    expect(readMonitoringConfig({})).toBeNull();
    expect(readMonitoringConfig({ VITE_SENTRY_DSN: '   ' })).toBeNull();
    await initErrorMonitoring({}, load);

    expect(load).not.toHaveBeenCalled();
    expect(isErrorMonitoringEnabled()).toBe(false);
    expect(listen.mock.calls.map(([type]) => type)).not.toContain('error');
    expect(listen.mock.calls.map(([type]) => type)).not.toContain('unhandledrejection');
    reportError(new Error('x'), { source: 'render' });
    expect(reporter.capture).not.toHaveBeenCalled();
  });

  it('a tela de erro aparece mesmo desligada', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Recarregue a página');
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeEnabled();
    expect(screen.queryByText(/falha de renderizacao/)).not.toBeInTheDocument();
  });

  it('se o SDK nao carregar, a captura fica desligada', async () => {
    await initErrorMonitoring(ENV, () => Promise.reject(new Error('sem rede')));
    expect(isErrorMonitoringEnabled()).toBe(false);
  });
});

describe('captura de erros ligada (D-101)', () => {
  it('erro de renderizacao: mostra a tela e reporta uma vez, com o padrao da tela e o id', async () => {
    const reporter = await enable();
    setMonitoringUser('user-1');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(reporter.capture).toHaveBeenCalledTimes(1);
    const [error, context] = reporter.capture.mock.calls[0];
    expect((error as Error).message).toBe('falha de renderizacao');
    expect(context).toEqual({
      source: 'render',
      componentStack: expect.stringContaining('Bomb'),
      route: '/leads/:id',
      userId: 'user-1',
    });
    expect(JSON.stringify(context)).not.toMatch(/segredo|ana@|0193a5b2/);
  });

  it('erro numa tela do roteador cai no errorElement e e reportado', async () => {
    const reporter = await enable();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const router = createMemoryRouter(
      [{ path: '/', element: <Bomb />, errorElement: <RouteErrorScreen /> }],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(reporter.capture).toHaveBeenCalledTimes(1);
    expect(reporter.capture.mock.calls[0][1]).toMatchObject({ source: 'route' });
  });

  it('reporta erro nao tratado e promise rejeitada da janela', async () => {
    const reporter = await enable();
    const error = new Error('quebrou');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    const reason = new Error('rejeitada');
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }));

    expect(reporter.capture).toHaveBeenCalledTimes(2);
    expect(reporter.capture.mock.calls[0]).toEqual([
      error,
      { source: 'window', route: '/leads/:id', userId: undefined },
    ]);
    expect(reporter.capture.mock.calls[1][1]).toMatchObject({ source: 'unhandledrejection' });
  });

  it('nao reporta resposta 4xx da API nem 401 de sessao expirada; 5xx sim', async () => {
    const reporter = await enable();
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      const error = new ApiError(status, 'X', 'previsto');
      reportError(error, { source: 'render' });
      window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: error }));
    }
    expect(reporter.capture).not.toHaveBeenCalled();
    expect(shouldReport(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'x'))).toBe(false);

    reportError(new ApiError(500, 'INTERNAL_ERROR', 'x'), { source: 'render' });
    expect(reporter.capture).toHaveBeenCalledTimes(1);
  });

  it('o mesmo erro chega uma vez so', async () => {
    const reporter = await enable();
    const error = new Error('duplo');
    reportError(error, { source: 'render' });
    window.dispatchEvent(new ErrorEvent('error', { error }));
    expect(reporter.capture).toHaveBeenCalledTimes(1);
  });

  it('erro durante o carregamento do SDK e guardado e enviado depois', async () => {
    const reporter = { capture: vi.fn() } satisfies Reporter;
    let finishLoading: () => void = () => undefined;
    const loading = initErrorMonitoring(
      ENV,
      () =>
        new Promise((resolve) => {
          finishLoading = () => resolve({ createSentryReporter: () => reporter });
        }),
    );
    reportError(new Error('cedo'), { source: 'render' });
    expect(reporter.capture).not.toHaveBeenCalled();
    finishLoading();
    await loading;
    expect(reporter.capture).toHaveBeenCalledTimes(1);
  });
});

describe('configuracao do SDK (D-101)', () => {
  const config: MonitoringConfig = { dsn: ENV.VITE_SENTRY_DSN, environment: 'staging' };

  it('sem dados pessoais, sem integracoes padrao, breadcrumbs, replay ou rastreamento', () => {
    const options = sentryOptions(config);
    expect(options).toMatchObject({
      dsn: ENV.VITE_SENTRY_DSN,
      environment: 'staging',
      sendDefaultPii: false,
      defaultIntegrations: false,
      maxBreadcrumbs: 0,
      sendClientReports: false,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
    });
    expect(options.tracesSampleRate).toBeUndefined();
    expect(options.replaysSessionSampleRate).toBeUndefined();
    expect((options.integrations as { name: string }[]).map((i) => i.name).sort()).toEqual([
      'Dedupe',
      'LinkedErrors',
    ]);
    expect(options.beforeBreadcrumb?.({ message: 'x' }, {})).toBeNull();
  });

  it('beforeSend descarta 4xx da API e limpa o resto', () => {
    const beforeSend = sentryOptions(config).beforeSend!;
    const event = (): SentryErrorEvent => ({
      type: undefined,
      request: { url: 'https://empresa.exemplo/redefinir-senha#token=segredo-123' },
    });
    expect(beforeSend(event(), { originalException: new ApiError(401, 'X', 'x') })).toBeNull();
    const kept = beforeSend(event(), { originalException: new Error('x') }) as SentryErrorEvent;
    expect(kept.request).toBeUndefined();
  });

  it('o reporter envia so origem, tela e id do usuario, no proprio evento', () => {
    const sdk = { init: vi.fn(), captureException: vi.fn() };
    const reporter = createSentryReporter(config, sdk);
    const error = new Error('x');
    reporter.capture(error, { source: 'route', route: '/leads/:id', userId: 'user-1' });
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).toHaveBeenCalledWith(error, {
      tags: { source: 'route', route: '/leads/:id' },
      user: { id: 'user-1' },
      contexts: undefined,
    });
  });
});

function dirtyEvent(): SentryErrorEvent {
  return {
    type: undefined,
    message:
      'Falha para ana.souza@exemplo.com em https://empresa.exemplo/x?email=a@b.co#token=frag-um',
    transaction: `/leads/${LEAD_ID}`,
    server_name: 'notebook-da-ana',
    request: {
      url: `https://empresa.exemplo/redefinir-senha?email=ana.souza@exemplo.com#token=segredo-123`,
      query_string: 'email=ana.souza@exemplo.com',
      cookies: { refresh_token: 'cookie-secreto' },
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura-123' },
      data: { name: 'Ana Souza', password: 'senha-secreta' },
    },
    user: {
      id: 'user-1',
      email: 'ana.souza@exemplo.com',
      username: 'Ana Souza',
      ip_address: '203.0.113.7',
    },
    tags: { source: 'render', route: '/leads/:id', customer_name: 'Ana Souza' },
    extra: { lead: { name: 'Ana Souza', phone: '41998765432' } },
    contexts: {
      react: {
        version: '19.2.0',
        componentStack:
          '\n    at LeadDetailPage (https://empresa.exemplo/a.js?v=1#token=frag-dois)',
        props: { email: 'ana.souza@exemplo.com' },
      },
      lead: { name: 'Ana Souza' },
    },
    breadcrumbs: [
      { category: 'navigation', data: { to: '/redefinir-senha#token=segredo-123' } },
      { category: 'ui.input', message: 'input[name="email"] ana.souza@exemplo.com' },
    ],
    exception: {
      values: [
        {
          type: 'Error',
          value:
            'Falhou em /redefinir-senha#token=segredo-123 para ana.souza@exemplo.com, ' +
            'telefone (41) 99876-5432, CPF 123.456.789-09, Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.x',
          stacktrace: {
            frames: [
              {
                filename:
                  'https://empresa.exemplo/assets/index.js?token=query-tres#token=frag-quatro',
                abs_path: 'https://empresa.exemplo/redefinir-senha#token=segredo-123',
                function: 'render',
                vars: { email: 'ana.souza@exemplo.com' },
                context_line: "const name = 'Ana Souza';",
              },
            ],
          },
        },
      ],
    },
  };
}

describe('scrubEvent (D-101)', () => {
  const event = scrubEvent(dirtyEvent());
  const sent = JSON.stringify(event);

  it('o token do fragmento (#token=) e a query string nunca saem', () => {
    expect(sent).not.toMatch(/segredo-123|frag-um|frag-dois|query-tres|frag-quatro/);
    expect(sent).not.toContain('email=');
    expect(sent).not.toContain('?');
  });

  it('remove requisicao, corpo, cabecalhos, cookies, breadcrumbs e extra', () => {
    expect(event.request).toBeUndefined();
    expect(event.breadcrumbs).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.server_name).toBeUndefined();
    expect(sent).not.toMatch(/cookie-secreto|senha-secreta|assinatura|eyJ/);
  });

  it('remove e-mail, nome, telefone, documento e IP do usuario', () => {
    expect(event.user).toEqual({ id: 'user-1' });
    expect(sent).not.toMatch(/ana\.souza|Ana Souza|99876|998765432|123\.456\.789|203\.0\.113/);
  });

  it('mantem so origem, tela, pilha e a pilha de componentes', () => {
    expect(event.tags).toEqual({ source: 'render', route: '/leads/:id' });
    expect(event.transaction).toBe('/leads/:id');
    expect(event.contexts).toEqual({
      react: {
        version: '19.2.0',
        componentStack: '\n    at LeadDetailPage (https://empresa.exemplo/a.js)',
      },
    });
    expect(event.exception?.values?.[0].stacktrace?.frames).toEqual([
      {
        filename: 'https://empresa.exemplo/assets/index.js',
        abs_path: 'https://empresa.exemplo/redefinir-senha',
        function: 'render',
      },
    ]);
  });

  it('padrao da tela troca ids e descarta query e fragmento', () => {
    expect(routeOf(`/leads/${LEAD_ID}/edit`)).toBe('/leads/:id/edit');
    expect(routeOf('/redefinir-senha')).toBe('/redefinir-senha');
    expect(routeOf('/x/42?token=a#token=b')).toBe('/x/:id');
  });
});

describe('SDK real com transporte em memoria (sem rede, D-101)', () => {
  afterEach(async () => {
    await close(100);
  });

  it('o envelope enviado nao leva token, query, e-mail nem nome', async () => {
    const envelopes: string[] = [];
    const reporter = createSentryReporter(
      { dsn: ENV.VITE_SENTRY_DSN, environment: 'test-unit' },
      {
        init: (options) =>
          init({
            ...options,
            transport: (transportOptions) =>
              createTransport(transportOptions, async (request) => {
                envelopes.push(String(request.body));
                return { statusCode: 200 };
              }),
          }),
        captureException: (await import('@sentry/react')).captureException,
      },
    );

    reporter.capture(
      new Error(
        'Falha ao abrir http://empresa.exemplo/redefinir-senha#token=segredo-123 de ana@exemplo.com',
      ),
      { source: 'window', route: routeOf(window.location.pathname), userId: 'user-1' },
    );
    await (await import('@sentry/react')).flush(1000);

    expect(envelopes).toHaveLength(1);
    const payload = JSON.parse(envelopes[0].split('\n')[2]);
    expect(payload.tags).toEqual({ source: 'window', route: '/leads/:id' });
    expect(payload.user).toEqual({ id: 'user-1' });
    expect(payload.request).toBeUndefined();
    expect(payload.breadcrumbs).toBeUndefined();
    expect(envelopes[0]).not.toMatch(/segredo-123|ana@exemplo|email=/);
  });
});
