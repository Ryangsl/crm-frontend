import type { ErrorEvent } from '@sentry/react';

// Privacidade dos eventos enviados ao provedor de captura de erros (D-101, LGPD). O evento sai por
// lista de permissao: o que nao esta previsto aqui e removido. Dado sensivel novo entra neste arquivo,
// com caso em `monitoring.test.tsx`. So tipos do SDK sao importados aqui (sem custo no bundle).

/** Tags que podem sair: origem do erro e o padrao da tela (`/leads/:id`). */
export const ALLOWED_TAGS: readonly string[] = ['source', 'route'];
const ALLOWED_CONTEXTS: readonly string[] = ['trace', 'react'];
const MAX_TEXT_LENGTH = 500;

/** URL sem query string nem fragmento (o link de redefinicao de senha leva o token em `#token=`). */
export function stripUrl(url: string): string {
  return url.split(/[?#]/)[0];
}

/**
 * Mensagens de erro sao texto livre: mascara o que tem forma de credencial ou dado pessoal e limita o
 * tamanho. Nomes de pessoas nao tem forma reconhecivel; por isso o codigo nao os coloca em mensagens.
 */
export function maskText(text: string): string {
  const masked = text
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s?#]+)[?#][^\s)'"]*/gi, '$1')
    .replace(/[?#&]?\b(token|access_token|refresh_token|code|password)=[^\s&#]*/gi, '[removido]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [token]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\+?\(?\d[\d.\-/() ]{6,}\d/g, (run) =>
      run.replace(/\D/g, '').length >= 8 ? '[número]' : run,
    )
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, '[token]');
  return masked.length > MAX_TEXT_LENGTH ? `${masked.slice(0, MAX_TEXT_LENGTH)}…` : masked;
}

function pick<T>(source: Record<string, T> | undefined, allowed: readonly string[]) {
  const kept: Record<string, T> = {};
  for (const key of allowed) {
    if (source && source[key] !== undefined) kept[key] = source[key];
  }
  return kept;
}

/**
 * `beforeSend`: devolve o evento so com o que e permitido sair. Vale para qualquer evento, inclusive os
 * que uma integracao futura do SDK venha a preencher sozinha.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.server_name;
  delete event.sdkProcessingMetadata;

  event.user = event.user?.id !== undefined ? { id: String(event.user.id) } : undefined;
  if (!event.user) delete event.user;

  event.tags = pick(event.tags, ALLOWED_TAGS);
  const contexts = pick(event.contexts, ALLOWED_CONTEXTS);
  // Do contexto `react` saem so a versao do React e a pilha de componentes (nomes, sem dados).
  const react = contexts.react as { componentStack?: unknown; version?: unknown } | undefined;
  if (react) {
    const kept: Record<string, string> = {};
    if (typeof react.version === 'string') kept.version = react.version;
    if (typeof react.componentStack === 'string') {
      kept.componentStack = maskText(react.componentStack);
    }
    contexts.react = kept;
  }
  event.contexts = contexts;

  const route = event.tags.route;
  if (typeof route === 'string') event.transaction = route;
  else delete event.transaction;

  if (typeof event.message === 'string') event.message = maskText(event.message);
  if (event.logentry) {
    event.logentry = {
      message:
        typeof event.logentry.message === 'string' ? maskText(event.logentry.message) : undefined,
    };
  }

  for (const value of event.exception?.values ?? []) {
    if (typeof value.value === 'string') value.value = maskText(value.value);
    for (const frame of value.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = stripUrl(frame.filename);
      if (frame.abs_path) frame.abs_path = stripUrl(frame.abs_path);
      delete frame.vars;
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
    }
  }
  return event;
}
