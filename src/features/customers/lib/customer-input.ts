import { ApiError } from '@/services/api';

// Telefone no formato que a API exige (E.164, ex.: +5511999999999). Aceita o jeito comum de digitar
// no Brasil: "(11) 99999-9999", "11999999999" ou "55 11 99999-9999". Valor que nao se encaixa vai
// como foi digitado, para o backend recusar com o motivo.
export function toE164(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+')) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55'))
    return `+${digits}`;
  return value;
}

const FIELDS: Record<string, { label: string; hint: string }> = {
  name: { label: 'Nome', hint: 'informe ao menos 2 caracteres' },
  document: { label: 'Documento', hint: 'CPF com 11 dígitos ou CNPJ com 14' },
  primary_phone: { label: 'Telefone', hint: 'use DDD e número, ex.: (11) 99999-9999' },
  primary_email: { label: 'E-mail', hint: 'e-mail inválido' },
};

// Erro de validação de cliente em português, com o campo: a API devolve o detalhe como texto que
// começa pelo nome do campo, às vezes com o caminho do objeto (ex.: "customer.primary_phone deve
// estar no formato E.164.").
export function describeCustomerValidation(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return null;
  const keys = new Set<string>();
  for (const detail of error.details) {
    const key = Object.keys(FIELDS).find(
      (field) => detail.field === field || new RegExp(`^(\\w+\\.)*${field}\\b`).test(detail.issue),
    );
    if (key) keys.add(key);
  }
  if (keys.size === 0) return null;
  return `Confira: ${[...keys].map((key) => `${FIELDS[key].label} (${FIELDS[key].hint})`).join('; ')}.`;
}
