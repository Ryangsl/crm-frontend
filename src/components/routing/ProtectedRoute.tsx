import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';

// Layout route (crm-frontend/src/routes/router.tsx): so libera <Outlet/> apos a tentativa
// de restauracao de sessao terminar. Nunca redireciona antes disso — evitar redirect
// prematuro para /login enquanto o refresh via cookie ainda esta em andamento.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Restaurando sessao" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
