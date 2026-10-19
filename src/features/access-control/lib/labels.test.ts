import { describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api';
import {
  accessControlErrorMessage,
  exceptionStatusLabel,
  isExceptionActive,
  isOutsideBusinessHours,
} from './labels';
import type { AccessException } from '../types/accessControl';

const NOW = new Date('2026-10-14T20:00:00.000Z');
const exception = (overrides: Partial<AccessException> = {}): AccessException => ({
  id: 'e1',
  user_id: 'u1',
  granted_by: 'g1',
  scope: 'leads',
  starts_at: '2026-10-14T19:00:00.000Z',
  expires_at: '2026-10-14T23:00:00.000Z',
  reason: 'Plantao',
  revoked_at: null,
  ...overrides,
});

describe('isOutsideBusinessHours', () => {
  it('so o 403 com o codigo OUTSIDE_BUSINESS_HOURS', () => {
    expect(isOutsideBusinessHours(new ApiError(403, 'OUTSIDE_BUSINESS_HOURS', 'x'))).toBe(true);
    expect(isOutsideBusinessHours(new ApiError(403, 'FORBIDDEN', 'x'))).toBe(false);
    expect(isOutsideBusinessHours(new ApiError(404, 'OUTSIDE_BUSINESS_HOURS', 'x'))).toBe(false);
    expect(isOutsideBusinessHours(new Error('x'))).toBe(false);
    expect(isOutsideBusinessHours(null)).toBe(false);
  });
});

describe('accessControlErrorMessage', () => {
  it('traduz os codigos do F4.7 e cai no fallback para o resto', () => {
    expect(
      accessControlErrorMessage(new ApiError(422, 'BUSINESS_HOURS_REQUIRED', 'x'), 'fallback'),
    ).toMatch(/horario de funcionamento valido/i);
    expect(
      accessControlErrorMessage(
        new ApiError(422, 'ACCESS_EXCEPTION_TARGET_NOT_RESTRICTED', 'x'),
        'fallback',
      ),
    ).toMatch(/nao esta sujeito/i);
    expect(
      accessControlErrorMessage(
        new ApiError(422, 'ACCESS_EXCEPTION_EXPIRY_INVALID', 'x'),
        'fallback',
      ),
    ).toMatch(/no futuro/i);
    expect(accessControlErrorMessage(new ApiError(403, 'FORBIDDEN', 'x'), 'fallback')).toMatch(
      /permissao/i,
    );
    expect(accessControlErrorMessage(new ApiError(500, 'ERROR', 'x'), 'fallback')).toBe('fallback');
    expect(accessControlErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});

describe('vigencia da excecao (mesma regra do backend)', () => {
  it('inicio inclusivo e fim exclusivo', () => {
    const e = exception();
    expect(isExceptionActive(e, new Date('2026-10-14T18:59:59.999Z'))).toBe(false);
    expect(isExceptionActive(e, new Date('2026-10-14T19:00:00.000Z'))).toBe(true);
    expect(isExceptionActive(e, new Date('2026-10-14T22:59:59.999Z'))).toBe(true);
    expect(isExceptionActive(e, new Date('2026-10-14T23:00:00.000Z'))).toBe(false);
  });

  it('revogada nunca esta vigente; o rotulo distingue vigente, revogada e expirada', () => {
    expect(exceptionStatusLabel(exception(), NOW)).toBe('Vigente');
    expect(exceptionStatusLabel(exception({ revoked_at: '2026-10-14T19:30:00.000Z' }), NOW)).toBe(
      'Revogada',
    );
    expect(exceptionStatusLabel(exception({ expires_at: '2026-10-14T19:30:00.000Z' }), NOW)).toBe(
      'Expirada',
    );
    expect(isExceptionActive(exception({ revoked_at: '2026-10-14T19:30:00.000Z' }), NOW)).toBe(
      false,
    );
  });
});
