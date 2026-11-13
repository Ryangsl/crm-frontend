import { routeOf, shouldReport } from './report-filter';

// Captura de erros (D-101). DESLIGADA sem VITE_SENTRY_DSN: nada e registrado, nada e carregado e
// nenhuma chamada sai do navegador. Com o DSN, o SDK vem por import dinamico (fora do bundle inicial)
// e so `sentry-reporter.ts` o importa. O resto do app usa so as funcoes deste arquivo.

export type ErrorSource = 'render' | 'route' | 'window' | 'unhandledrejection';

export interface ErrorReport {
  source: ErrorSource;
  /** Pilha de componentes do React (nomes de componentes, sem dados). */
  componentStack?: string;
}

/** O que o reporter recebe: so o permitido (D-101). */
export interface ReporterContext extends ErrorReport {
  route: string;
  userId?: string;
}

export interface Reporter {
  capture(error: unknown, context: ReporterContext): void;
}

export interface MonitoringConfig {
  dsn: string;
  environment: string;
  release?: string;
}

interface MonitoringEnv {
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
  MODE?: string;
}

type LoadReporter = () => Promise<{ createSentryReporter(config: MonitoringConfig): Reporter }>;

const MAX_PENDING = 10;

let state: 'off' | 'loading' | 'on' = 'off';
let reporter: Reporter | null = null;
let pending: Array<[unknown, ReporterContext]> = [];
let userId: string | null = null;
let removeListeners: (() => void) | null = null;
// O mesmo erro pode chegar por dois caminhos (tela de erro e janela) ou duas vezes no modo estrito.
let reported = new WeakSet<object>();

export function readMonitoringConfig(env: MonitoringEnv): MonitoringConfig | null {
  const dsn = env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return null;
  return {
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT?.trim() || env.MODE || 'production',
    release: env.VITE_SENTRY_RELEASE?.trim() || undefined,
  };
}

export function isErrorMonitoringEnabled(): boolean {
  return state !== 'off';
}

/**
 * Reporta um erro inesperado. Erro previsto (resposta 4xx da API, inclusive 401 de sessao) nunca e
 * reportado. Nao lanca: monitoramento nao altera o fluxo de quem chama.
 */
export function reportError(error: unknown, report: ErrorReport): void {
  if (state === 'off' || !shouldReport(error)) return;
  if (typeof error === 'object' && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  const context: ReporterContext = {
    ...report,
    route: routeOf(window.location.pathname),
    userId: userId ?? undefined,
  };
  if (state === 'loading') {
    if (pending.length < MAX_PENDING) pending.push([error, context]);
    return;
  }
  try {
    reporter?.capture(error, context);
  } catch {
    // idem
  }
}

/** So o id (opaco) do usuario logado; nunca nome nem e-mail. `null` ao sair. */
export function setMonitoringUser(id: string | null): void {
  userId = id;
}

function installWindowListeners(): () => void {
  const onError = (event: ErrorEvent) => {
    // Sem objeto de erro (ex.: "Script error." de outra origem) nao ha o que reportar.
    if (event.error) reportError(event.error, { source: 'window' });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { source: 'unhandledrejection' });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/**
 * Chamado uma vez, antes de renderizar. Sem DSN nao faz nada. Com DSN, passa a ouvir os erros nao
 * tratados da janela e guarda ate 10 enquanto o SDK carrega; se o carregamento falhar (ex.: sem
 * rede), a captura fica desligada sem afetar o app.
 */
export async function initErrorMonitoring(
  env: MonitoringEnv = import.meta.env,
  load: LoadReporter = () => import('./sentry-reporter'),
): Promise<void> {
  if (state !== 'off') return;
  const config = readMonitoringConfig(env);
  if (!config) return;
  state = 'loading';
  removeListeners = installWindowListeners();
  try {
    const { createSentryReporter } = await load();
    reporter = createSentryReporter(config);
    state = 'on';
    const queued = pending;
    pending = [];
    for (const [error, context] of queued) reporter.capture(error, context);
  } catch {
    resetErrorMonitoring();
  }
}

/** Volta ao estado inicial (desligado). Usado nos testes e quando o SDK nao carrega. */
export function resetErrorMonitoring(): void {
  removeListeners?.();
  removeListeners = null;
  state = 'off';
  reporter = null;
  pending = [];
  userId = null;
  reported = new WeakSet<object>();
}
