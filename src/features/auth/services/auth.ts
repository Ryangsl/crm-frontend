import { ApiError, apiGet, apiPost, refreshAccessToken, setAccessToken } from '@/services/api';
import type { AuthUser, LoginCredentials } from '../types/auth';

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

// Espelha UserResponseDto (crm-backend). `permissions` e opcional/defensivo: o endpoint
// real ainda nao o inclui (ver types/auth.ts) — lido aqui para nao quebrar quando o
// backend passar a envia-lo.
interface MeResponse {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  created_at: string;
  permissions?: string[];
  roles?: string[];
}

interface TenantContextResponse {
  tenant_name: string;
}

// D-088: empresa do endereco aberto no navegador. null quando o endereco nao corresponde a nenhuma
// empresa (404 TENANT_DOMAIN_NOT_FOUND); outros erros sobem para quem chama.
export async function fetchTenantContext(): Promise<TenantContextResponse | null> {
  try {
    return await apiGet<TenantContextResponse>('/v1/auth/tenant');
  } catch (error) {
    if (error instanceof ApiError && error.code === 'TENANT_DOMAIN_NOT_FOUND') return null;
    throw error;
  }
}

export async function login(credentials: LoginCredentials): Promise<void> {
  const tokens = await apiPost<AccessTokenResponse>('/v1/auth/login', credentials);
  setAccessToken(tokens.access_token);
}

// Usa o refresh token do cookie httpOnly (nunca lido/escrito aqui) para obter um novo
// access token. Retorna false em qualquer falha, sem lancar — quem chama decide o que
// fazer (restaurar sessao vs. permanecer deslogado). Passa pela mesma renovacao coordenada do
// cliente HTTP (uma por vez, inclusive entre abas — D-091).
export async function refreshSession(): Promise<boolean> {
  return (await refreshAccessToken()) !== null;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const me = await apiGet<MeResponse>('/v1/users/me');
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    status: me.status,
    permissions: me.permissions ?? [],
    roles: me.roles ?? [],
  };
}

export async function logout(): Promise<void> {
  await apiPost<void>('/v1/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await apiPost<void>('/v1/auth/logout-all');
}
