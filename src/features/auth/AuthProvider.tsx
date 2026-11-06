import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 *
 * Varias abas (D-091): a sessao (cookie do refresh) e a mesma em todas as abas do navegador. Um
 * BroadcastChannel avisa as outras abas quando esta sai (elas encerram a sessao local, sem chamar a
 * API) ou entra (elas descartam o cache e retomam a sessao atual, que pode ser de outro usuario).
 * Nenhum token passa pelo canal.
 */
export const AUTH_CHANNEL_NAME = 'crm-universal:auth';
type AuthBroadcast = { type: 'signed-in' } | { type: 'signed-out' };

// Retoma a sessao pelo cookie: renova (coordenado entre abas) e busca o usuario. null = sem sessao.
async function resumeSession(): Promise<AuthUser | null> {
  if (!(await authService.refreshSession())) return null;
  try {
    return await authService.fetchCurrentUser();
  } catch {
    return null;
  }
}

function openAuthChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL_NAME);
}

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

  // Aplica o resultado de resumeSession(); `isCurrent` descarta uma tentativa ja superada.
  const applyResumed = useCallback(
    (me: AuthUser | null, isCurrent: () => boolean) => {
      if (!isCurrent()) return;
      if (!me) {
        clearSession();
        return;
      }
      setUser(me);
      setStatus('authenticated');
    },
    [clearSession],
  );

  useEffect(() => {
    let cancelled = false;
    void resumeSession().then((me) => applyResumed(me, () => !cancelled));
    return () => {
      cancelled = true;
    };
  }, [applyResumed]);

  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const channel = openAuthChannel();
    channelRef.current = channel;
    if (!channel) return;
    let generation = 0;
    channel.onmessage = (event: MessageEvent<AuthBroadcast>) => {
      if (event.data?.type === 'signed-out') {
        generation += 1;
        clearSession();
      } else if (event.data?.type === 'signed-in') {
        // Outra aba entrou (talvez com outro usuario): nada do cache atual pode sobrar.
        const mine = ++generation;
        setAccessToken(null);
        resetServerCache();
        setUser(null);
        setStatus('loading');
        void resumeSession().then((me) => applyResumed(me, () => mine === generation));
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clearSession, resetServerCache, applyResumed]);

  const broadcast = useCallback((message: AuthBroadcast) => {
    channelRef.current?.postMessage(message);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await authService.login({ email, password });
      // Rede de seguranca: um login nunca herda cache de sessao anterior (normalmente ja vazio).
      resetServerCache();
      const me = await authService.fetchCurrentUser();
      setUser(me);
      setStatus('authenticated');
      broadcast({ type: 'signed-in' });
    },
    [resetServerCache, broadcast],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
      broadcast({ type: 'signed-out' });
    }
  }, [clearSession, broadcast]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      clearSession();
      broadcast({ type: 'signed-out' });
    }
  }, [clearSession, broadcast]);

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
