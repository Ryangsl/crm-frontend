import { ApiError } from '@/services/api';
import type { AccessException, AccessExceptionScope } from '../types/accessControl';

export const OUTSIDE_BUSINESS_HOURS_CODE = 'OUTSIDE_BUSINESS_HOURS';

export const SCOPE_LABELS: Record<AccessExceptionScope, string> = {
  leads: 'Leads',
  conversations: 'Conversas',
  all: 'Leads e Conversas',
};

// 403 de restricao por horario (D-082): a requisicao foi barrada por estar fora do horario.
export function isOutsideBusinessHours(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 403 && error.code === OUTSIDE_BUSINESS_HOURS_CODE
  );
}

// Erros de dominio do F4.7 -> texto para o usuario. Os codigos alem de OUTSIDE_BUSINESS_HOURS sao
// escolhas de implementacao do backend (nomes nao definitivos no contrato).
export function accessControlErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case OUTSIDE_BUSINESS_HOURS_CODE:
        return 'Acesso indisponivel fora do horario de funcionamento da empresa.';
      case 'BUSINESS_HOURS_REQUIRED':
        return 'Configure um horario de funcionamento valido antes de ativar a restricao.';
      case 'ACCESS_EXCEPTION_TARGET_NOT_RESTRICTED':
        return 'Esse usuario nao esta sujeito a restricao por horario; a liberacao nao teria efeito.';
      case 'ACCESS_EXCEPTION_EXPIRY_INVALID':
        return 'A expiracao da liberacao deve estar no futuro.';
      default:
        if (error.status === 403) return 'Voce nao tem permissao para esta acao.';
        if (error.status === 404) return 'Registro nao encontrado.';
    }
  }
  return fallback;
}

// Vigente agora: nao revogada e dentro de [starts_at, expires_at) — mesma regra do backend.
export function isExceptionActive(exception: AccessException, now: Date = new Date()): boolean {
  return (
    exception.revoked_at === null &&
    new Date(exception.starts_at).getTime() <= now.getTime() &&
    now.getTime() < new Date(exception.expires_at).getTime()
  );
}

export function exceptionStatusLabel(exception: AccessException, now: Date = new Date()): string {
  if (exception.revoked_at) return 'Revogada';
  if (isExceptionActive(exception, now)) return 'Vigente';
  return 'Expirada';
}
