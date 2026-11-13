import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { ErrorScreen } from './ErrorScreen';
import { reportError } from './monitoring';

// `errorElement` das rotas de topo: o roteador captura o erro de renderizacao de uma tela antes do
// boundary do app, entao o reporte acontece aqui (D-101). Resposta de rota 4xx nao e reportada.
export function RouteErrorScreen() {
  const error = useRouteError();

  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status < 500) return;
    reportError(error, { source: 'route' });
  }, [error]);

  return <ErrorScreen />;
}
