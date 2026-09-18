export interface Customer {
  id: string;
  name: string;
  document: string | null;
  primary_phone: string | null;
  primary_email: string | null;
  owner_id: string | null;
  tags: string[];
  custom_fields: unknown;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  data: Customer[];
  page: number;
  limit: number;
  total: number;
}

// Espelha CreateCustomerDto/UpdateCustomerDto (crm-backend). owner_id ausente na criacao =
// backend usa o usuario autenticado como padrao; `null` explicito na edicao limpa o campo.
export interface CustomerInput {
  name: string;
  document?: string;
  primary_phone?: string;
  primary_email?: string;
  owner_id?: string | null;
  tags?: string[];
}

// Espelha CustomerDuplicateCandidate (crm-backend/src/common/exceptions/domain.exception.ts)
// — payload do 409 de D-067.
export interface CustomerDuplicateCandidate {
  id: string;
  name: string;
  document: string | null;
  primary_phone: string | null;
  primary_email: string | null;
}

export interface Contact {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInput {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}
