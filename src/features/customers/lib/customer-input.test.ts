import { describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api';
import { describeCustomerValidation, toE164 } from './customer-input';

describe('toE164', () => {
  it.each([
    ['(11) 99999-9999', '+5511999999999'],
    ['11 3333-4444', '+551133334444'],
    ['11999999999', '+5511999999999'],
    ['55 11 99999-9999', '+5511999999999'],
    ['+55 (11) 99999-9999', '+5511999999999'],
    ['+351 912 345 678', '+351912345678'],
  ])('%s -> %s', (raw, expected) => {
    expect(toE164(raw)).toBe(expected);
  });

  it('vazio vira ausente e o que nao encaixa vai como foi digitado (o backend explica)', () => {
    expect(toE164('   ')).toBeUndefined();
    expect(toE164('123')).toBe('123');
  });
});

describe('describeCustomerValidation', () => {
  const validation = (...issues: string[]) =>
    new ApiError(
      400,
      'VALIDATION_ERROR',
      'Erro de validacao.',
      issues.map((issue) => ({ field: 'unknown', issue })),
    );

  it('diz qual campo corrigir, inclusive com caminho aninhado', () => {
    expect(
      describeCustomerValidation(
        validation(
          'primary_phone deve estar no formato E.164.',
          'customer.document deve ter 11 (CPF) ou 14 (CNPJ) digitos.',
        ),
      ),
    ).toBe(
      'Confira: Telefone (use DDD e número, ex.: (11) 99999-9999); Documento (CPF com 11 dígitos ou CNPJ com 14).',
    );
  });

  it('nao reconhece campo parecido nem outros erros', () => {
    expect(describeCustomerValidation(validation('nameless qualquer coisa'))).toBeNull();
    expect(describeCustomerValidation(new ApiError(409, 'CONFLICT', 'x'))).toBeNull();
  });
});
