import { ApiError } from '../../services/api';

// Filtro e padrao de tela da captura de erros (D-101). Separado de `scrub-event.ts` para que so isto
// fique no bundle inicial; a limpeza do evento vai junto com o SDK, no carregamento sob demanda.

/**
 * Erro previsto nao e reportado: toda resposta 4xx da API (validacao, permissao, conflito, 401 de
 * sessao expirada...). Erro de servidor (5xx) e qualquer outro erro seguem.
 */
export function shouldReport(error: unknown): boolean {
  return !(error instanceof ApiError && error.status < 500);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Padrao da tela: so o caminho, com ids trocados por `:id` (sem query string nem fragmento). */
export function routeOf(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path
    .split('/')
    .map((segment) => (UUID.test(segment) || /^\d+$/.test(segment) ? ':id' : segment))
    .join('/');
}
