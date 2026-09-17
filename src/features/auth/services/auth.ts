import { apiGet, apiPost, setAccessToken } from '@/services/api';
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
}

export async function login(credentials: LoginCredentials): Promise<void> {
  const tokens = await apiPost<AccessTokenResponse>('/v1/auth/login', credentials);
  setAccessToken(tokens.access_token);
}

// Usa o refresh token do cookie httpOnly (nunca lido/escrito aqui) para obter um novo
// access token. Retorna false em qualquer falha, sem lancar — quem chama decide o que
// fazer (restaurar sessao vs. permanecer deslogado).
export async function refreshSession(): Promise<boolean> {
  try {
    const tokens = await apiPost<AccessTokenResponse>('/v1/auth/refresh');
    setAccessToken(tokens.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const me = await apiGet<MeResponse>('/v1/users/me');
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    status: me.status,
    permissions: me.permissions ?? [],
  };
}

export async function logout(): Promise<void> {
  await apiPost<void>('/v1/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await apiPost<void>('/v1/auth/logout-all');
}
