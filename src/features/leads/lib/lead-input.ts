import { ApiError } from '@/services/api';
import { toE164 } from '@/features/customers/lib/customer-input';
import type { Lead, LeadInput } from '../types/lead';

// D-094: cadastro manual de Lead pela tela. Lead e uma possibilidade de cliente: precisa do nome e de
// ao menos um jeito de falar com a pessoa (telefone ou e-mail). Documento e opcional. A API continua
// aceitando Lead sem esses dados (importacao por planilha e integracoes); a exigencia e do cadastro
// manual.
export interface LeadFormValues {
  name: string;
  phone: string;
  email: string;
  document: string;
  sourceId: string;
}

export type LeadFormErrors = Partial<Record<keyof LeadFormValues | 'contact', string>>;

export function initialLeadValues(lead?: Lead): LeadFormValues {
  return {
    name: lead?.name ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    document: lead?.document ?? '',
    sourceId: lead?.source_id ?? '',
  };
}

// Conversao em Cliente novo: os dados do lead entram como valores iniciais do formulario, todos
// editaveis. Mapeamento do contrato (CustomerCreate): name -> name, document -> document (campo unico,
// CPF ou CNPJ), phone -> primary_phone, email -> primary_email. Dado ausente vira campo vazio.
export interface ConvertCustomerValues {
  name: string;
  document: string;
  phone: string;
  email: string;
}

export function convertCustomerValues(lead: Lead): ConvertCustomerValues {
  return {
    name: lead.name ?? '',
    document: lead.document ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLead(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Informe o nome (ao menos 2 caracteres).';
  if (!values.sourceId) errors.sourceId = 'Selecione a origem.';
  const phone = values.phone.trim();
  const email = values.email.trim();
  if (!phone && !email)
    errors.contact = 'Informe telefone ou e-mail para conseguir falar com o lead.';
  if (phone && !/^\+[1-9]\d{7,14}$/.test(toE164(phone) ?? '')) {
    errors.phone = 'Use DDD e número, ex.: (11) 99999-9999.';
  }
  if (email && !EMAIL.test(email)) errors.email = 'E-mail inválido.';
  const documentDigits = values.document.replace(/\D/g, '');
  if (documentDigits && documentDigits.length !== 11 && documentDigits.length !== 14) {
    errors.document = 'CPF com 11 dígitos ou CNPJ com 14.';
  }
  return errors;
}

// Corpo da API. Na criacao, campo vazio nao e enviado; na edicao, campo apagado vira null (limpa).
export function toLeadPayload(values: LeadFormValues, editing: boolean): LeadInput {
  const clear = editing ? null : undefined;
  const documentDigits = values.document.replace(/\D/g, '');
  return {
    source_id: values.sourceId,
    name: values.name.trim(),
    phone: toE164(values.phone) ?? clear,
    email: values.email.trim().toLowerCase() || clear,
    document: documentDigits || clear,
  };
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  document: 'Documento',
  source_id: 'Origem',
};

// Erro de validacao da API com o campo, em portugues (o detalhe vem como texto que comeca pelo nome do
// campo, ex.: "phone must match ...").
export function describeLeadValidation(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return null;
  const labels = new Set<string>();
  for (const detail of error.details) {
    const key = Object.keys(FIELD_LABELS).find(
      (field) => detail.field === field || new RegExp(`^(\\w+\\.)*${field}\\b`).test(detail.issue),
    );
    if (key) labels.add(FIELD_LABELS[key]);
  }
  return labels.size ? `Confira: ${[...labels].join(', ')}.` : null;
}
