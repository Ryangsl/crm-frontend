import type { PasswordResetLink } from '../hooks/useUsers';

export const RESET_PASSWORD_PATH = '/redefinir-senha';

// O token vai no fragmento (#token=...): o navegador nunca envia o fragmento ao servidor, entao ele
// nao aparece em log de acesso nem no cabecalho Referer. O endereco e o da empresa (D-088).
export function resetLinkUrl(link: PasswordResetLink, origin = window.location.origin): string {
  return `${origin}${RESET_PASSWORD_PATH}#token=${encodeURIComponent(link.token)}`;
}

export function formatExpiry(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
