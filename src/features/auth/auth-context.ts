import { createContext } from 'react';

import type { AuthUser } from './types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  // Apenas UX (ocultar/desabilitar acoes) — nunca autoridade de seguranca. O backend
  // continua validando permissao em toda escrita, independente do que a UI mostra.
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
