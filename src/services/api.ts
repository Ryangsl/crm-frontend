/*
 * Cliente HTTP base. O frontend so fala com a API (crm-spec/docs/05-api/api-guidelines.md
 * secao 10) — nunca com banco, nunca com outro armazenamento.
 *
 * `credentials: 'include'` e necessario desde a Fase 2 (backend): o refresh token viaja em
 * cookie httpOnly (ADR-008/D1), e sem isso o browser nunca envia nem recebe esse cookie em
 * requisicoes cross-port (dev: :5173 -> :3000). A UI de login/sessao em si (formulario,
 * interceptor de refresh automatico) ainda nao existe — fora do escopo desta mudanca.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Falha ao consultar ${path} (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}

export const apiBaseUrl = BASE_URL;
