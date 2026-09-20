import { describe, expect, it } from 'vitest';

import { formatMoney, parseMoney } from './money';

describe('parseMoney', () => {
  it('vazio vira null (sem valor)', () => {
    expect(parseMoney('  ')).toEqual({ ok: true, value: null });
  });

  it('aceita ponto e virgula como separador decimal e ponto de milhar pt-BR', () => {
    expect(parseMoney('1500.5')).toEqual({ ok: true, value: '1500.5' });
    expect(parseMoney('1500,50')).toEqual({ ok: true, value: '1500.50' });
    expect(parseMoney('1.500,50')).toEqual({ ok: true, value: '1500.50' });
    expect(parseMoney('10')).toEqual({ ok: true, value: '10' });
  });

  it('rejeita negativo, texto e mais de 2 casas', () => {
    for (const bad of ['-5', 'abc', '10,999', '1,2,3', '1e5']) {
      expect(parseMoney(bad)).toEqual({ ok: false });
    }
  });
});

describe('formatMoney', () => {
  it('formata em reais sem passar por number', () => {
    expect(formatMoney('1500.50')).toBe('R$ 1.500,50');
    expect(formatMoney('0.5')).toBe('R$ 0,50');
    expect(formatMoney('1234567.00')).toBe('R$ 1.234.567,00');
  });

  it('null vira "Sem valor"', () => {
    expect(formatMoney(null)).toBe('Sem valor');
  });
});
