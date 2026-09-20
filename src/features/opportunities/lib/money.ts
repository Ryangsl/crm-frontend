// Dinheiro NUNCA passa por number: entrada e saida sao strings decimais. Estes helpers so
// normalizam texto digitado e formatam para exibicao (sem aritmetica).
const DECIMAL = /^\d{1,12}(\.\d{1,2})?$/;

export type MoneyParse = { ok: true; value: string | null } | { ok: false };

// Aceita "1500.5", "1500,50" e "1.500,50" (pt-BR: com virgula, o ponto e separador de milhar).
export function parseMoney(raw: string): MoneyParse {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (trimmed === '') return { ok: true, value: null };
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  return DECIMAL.test(normalized) ? { ok: true, value: normalized } : { ok: false };
}

export function formatMoney(value: string | null): string {
  if (value === null) return 'Sem valor';
  const [integer, decimals = '00'] = value.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${grouped},${decimals.padEnd(2, '0')}`;
}
