import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { setAccessToken, setUnauthorizedHandler } from '@/services/api';
import { AuthContext } from './auth-context';
import type { AuthState, AuthStatus } from './auth-context';
import * as authService from './services/auth';
import type { AuthUser } from './types/auth';

/*
 * Fundacao de autenticacao da Fase 3 (D-066). Nao presume que existir cookie significa
 * estar autenticado: ao montar, tenta restaurar a sessao chamando /v1/auth/refresh (via
 * cookie httpOnly) e so entao busca o usuario. Qualquer 401 subsequente que sobreviva ao
 * retry automatico do cliente HTTP (services/api.ts) cai aqui via setUnauthorizedHandler,
 * encerrando a sessao no frontend — o backend continua sendo a autoridade final.
 *
 * Isolamento entre sessoes: o cache do TanStack Query guarda dado do usuario (ex.: notificacoes)
 * sob chaves que nao incluem o usuario. Por isso TODO encerramento efetivo de sessao (logout,
 * logout-all, 401 que sobreviveu ao refresh, falha ao restaurar a sessao) cancela as consultas em
 * andamento e esvazia o cache. Renovar o access token com sucesso NAO e fim de sessao e nunca
 * limpa nada.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  // Cancela primeiro: uma consulta do usuario anterior ainda em voo seria resolvida sobre uma
  // Query ja removida do cache (orfa), entao nao reaparece para o proximo usuario.
  const resetServerCache = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    resetServerCache();
    setUser(null);
    setStatus('unauthenticated');
  }, [resetServerCache]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const restored = await authService.refreshSession();
      if (!restored) {
        if (!cancelled) clearSession();
        return;
      }
      try {
        const me = await authService.fetchCurrentUser();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) clearSession();
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authService.login({ email, password });
      // Rede de seguranca: um login nunca herda cache de sessao anterior (normalmente ja vazio).
      resetServerCache();
      const me = await authService.fetchCurrentUser();
      setUser(me);
      setStatus('authenticated');
    },
    [resetServerCache],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ status, user, login, logout, logoutAll, hasPermission }),
    [status, user, login, logout, logoutAll, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
