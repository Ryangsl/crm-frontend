import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { AuthProvider } from '../features/auth/AuthProvider';
import { UiProvider } from './UiProvider';

// Estado de servidor fica no TanStack Query; estado de UI no UiProvider (D-018); sessao
// no AuthProvider (D-066) — precisa envolver o router, ja que ProtectedRoute consome
// useAuth().
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UiProvider>{children}</UiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
