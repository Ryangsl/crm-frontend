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
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

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

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// Rotas de auth nunca levam Bearer (fazem sentido sem sessao) e nunca disparam o
// fluxo de refresh-e-repete (evita recursao: refresh tentando renovar a si mesmo).
function isAuthPath(path: string): boolean {
  return path.startsWith('/v1/auth/');
}

async function parseErrorBody(response: Response): Promise<StandardErrorBody['error']> {
  try {
    const body = (await response.json()) as Partial<StandardErrorBody>;
    if (body.error?.code && body.error.message) {
      return { code: body.error.code, message: body.error.message, details: body.error.details ?? [] };
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

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { access_token: string; expires_in: number };
      setAccessToken(body.access_token);
      return body.access_token;
    } catch {
      return null;
    }
  })().finally(() => {
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
    const { code, message, details } = await parseErrorBody(response);
    throw new ApiError(response.status, code, message, details);
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
