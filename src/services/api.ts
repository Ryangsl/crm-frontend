/*
 * Cliente HTTP base. O frontend so fala com a API (crm-spec/docs/05-api/api-guidelines.md
 * secao 10) — nunca com banco, nunca com outro armazenamento.
 *
 * Sessao (Fase 3, D-066): access token mantido em memoria neste modulo — nunca em
 * localStorage/sessionStorage. Refresh token trafega em cookie httpOnly (D-005/D-006),
 * nunca lido/escrito aqui. Em 401 fora de /v1/auth/*, tenta um unico refresh e repete a
 * requisicao original uma vez; requisicoes concorrentes que caem em 401 ao mesmo tempo
 * compartilham a mesma promise de refresh (nunca disparam mais de um
 * POST /v1/auth/refresh simultaneo). Se o refresh falhar, o handler registrado via
 * setUnauthorizedHandler() e chamado para encerrar a sessao no AuthProvider.
 *
 * Varias abas (D-091): o cookie do refresh e um so para todas as abas, e cada renovacao o troca por
 * outro (rotacao, D-056). Duas abas renovando ao mesmo tempo apresentariam o mesmo token, e a
 * segunda seria tratada como reuso (todas as sessoes revogadas). Por isso toda renovacao passa por
 * um Web Lock do navegador, compartilhado entre as abas da mesma origem: uma aba so renova depois de
 * a anterior terminar, e ai o navegador ja manda o cookie novo. Nada vai para localStorage: cada
 * aba continua com o proprio access token em memoria.
 */
//
// D-088: a API e chamada no MESMO endereco da empresa (ex.: empresa-a.crm-universal.com.br/v1/...),
// porque e o endereco que identifica a empresa no login. Por isso a base padrao e vazia (mesma
// origem): em producao o proxy reverso encaminha /v1 ao backend; em desenvolvimento, o proxy do Vite
// (vite.config.ts). VITE_API_URL so serve para outra origem que preserve o Host da empresa.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    // Corpo completo da resposta de erro, alem de `error` — algumas excecoes de dominio
    // trazem dado estruturado adicional ao lado de `error` (ex.: `candidates` no 409 de
    // deduplicacao de Customer, D-067). Generico de proposito: este modulo nao conhece
    // formatos especificos por recurso, quem chama extrai o que precisar.
    readonly body: unknown = undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface StandardErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;
let apiErrorListener: ((error: ApiError) => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// Observador de toda resposta de erro da API. Generico: este modulo nao conhece codigos de negocio;
// quem registra decide o que fazer (hoje, os avisos de plano no AppShell).
export function setApiErrorListener(listener: ((error: ApiError) => void) | null): void {
  apiErrorListener = listener;
}

// Rotas de auth nunca levam Bearer (fazem sentido sem sessao) e nunca disparam o
// fluxo de refresh-e-repete (evita recursao: refresh tentando renovar a si mesmo).
function isAuthPath(path: string): boolean {
  return path.startsWith('/v1/auth/');
}

async function parseErrorBody(
  response: Response,
): Promise<StandardErrorBody['error'] & { body?: unknown }> {
  try {
    const body = (await response.json()) as Partial<StandardErrorBody>;
    if (body.error?.code && body.error.message) {
      return {
        code: body.error.code,
        message: body.error.message,
        details: body.error.details ?? [],
        body,
      };
    }
  } catch {
    // Corpo vazio/nao-JSON — cai no fallback abaixo.
  }
  return {
    code: 'ERROR',
    message: `Falha ao processar a requisicao (HTTP ${response.status}).`,
    details: [],
  };
}

export const REFRESH_LOCK_NAME = 'crm-universal:auth-refresh';
// Limite de uma renovacao: o lock nunca fica preso por uma requisicao sem resposta.
const REFRESH_TIMEOUT_MS = 15_000;

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  // Sem Web Locks (navegador antigo ou contexto inseguro): renova sem coordenar entre abas.
  if (!locks?.request) return task();
  return locks.request(REFRESH_LOCK_NAME, { mode: 'exclusive' }, task) as Promise<T>;
}

async function postRefresh(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { access_token: string; expires_in: number };
    return body.access_token;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Renova o access token pelo cookie do refresh. Uma so renovacao por aba de cada vez (pedidos
// simultaneos da mesma aba esperam a mesma promise) e uma so entre abas (Web Lock). Devolve o novo
// access token ou null; nunca lanca.
export function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= withRefreshLock(postRefresh)
    .then((token) => {
      if (token) setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, retrying = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (accessToken && !isAuthPath(path)) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include', headers });

  if (response.status === 401 && !isAuthPath(path) && !retrying) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, init, true);
    }
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const { code, message, details, body } = await parseErrorBody(response);
    const error = new ApiError(response.status, code, message, details, body);
    apiErrorListener?.(error);
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

export function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: 'DELETE' });
}

export const apiBaseUrl = BASE_URL;
