import { captureException, dedupeIntegration, init, linkedErrorsIntegration } from '@sentry/react';
import type { BrowserOptions } from '@sentry/react';

import type { MonitoringConfig, Reporter, ReporterContext } from './monitoring';
import { shouldReport } from './report-filter';
import { maskText, scrubEvent } from './scrub-event';

// Unico arquivo que importa o SDK do Sentry (D-101). Chega so por import dinamico de `monitoring.ts`,
// e apenas com VITE_SENTRY_DSN; sem DSN este modulo nunca e baixado.

// Coleta automatica desligada item a item. `sendDefaultPii: false` sozinho ainda deixa o SDK coletar
// cookies, cabecalhos e query string com lista de bloqueio, e a partir da v11 deixa de existir.
const DATA_COLLECTION_OFF: NonNullable<BrowserOptions['dataCollection']> = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};

interface Sdk {
  init: (options: BrowserOptions) => unknown;
  captureException: typeof captureException;
}

export function sentryOptions(config: MonitoringConfig): BrowserOptions {
  return {
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    dataCollection: DATA_COLLECTION_OFF,
    // Sem integracoes padrao: nada de breadcrumbs (cliques, console, fetch, navegacao com a URL),
    // dados da requisicao (URL com `#token=`), replay ou rastreamento de desempenho. Os erros nao
    // tratados da janela chegam por `monitoring.ts`, que ja filtra o previsto.
    defaultIntegrations: false,
    integrations: [linkedErrorsIntegration(), dedupeIntegration()],
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    sendClientReports: false,
    beforeSend: (event, hint) => (shouldReport(hint.originalException) ? scrubEvent(event) : null),
  };
}

export function createSentryReporter(
  config: MonitoringConfig,
  sdk: Sdk = { init, captureException },
): Reporter {
  sdk.init(sentryOptions(config));
  return {
    // O contexto vai no proprio evento, nunca num escopo compartilhado.
    capture(error: unknown, context: ReporterContext) {
      sdk.captureException(error, {
        tags: { source: context.source, route: context.route },
        user: context.userId ? { id: context.userId } : undefined,
        contexts: context.componentStack
          ? { react: { componentStack: maskText(context.componentStack) } }
          : undefined,
      });
    },
  };
}
