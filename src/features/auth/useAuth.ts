import { useContext } from 'react';

import { AuthContext } from './auth-context';
import type { AuthState } from './auth-context';

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return context;
}
