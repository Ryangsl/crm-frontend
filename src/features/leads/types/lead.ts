export type LeadStatus = 'new' | 'in_progress' | 'qualified' | 'disqualified' | 'converted';

export interface Lead {
  id: string;
  status: LeadStatus;
  source_id: string;
  customer_id: string | null;
  owner_id: string | null;
  disqualify_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadListResponse {
  data: Lead[];
  page: number;
  limit: number;
  total: number;
}

// customer_id nao faz parte do contrato de criacao/edicao — so e preenchido via convert
// (BR-04/D-065, mesmo criterio do backend).
export interface LeadInput {
  source_id: string;
  owner_id?: string | null;
}

export interface LeadSource {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LeadSourceListResponse {
  data: LeadSource[];
  page: number;
  limit: number;
  total: number;
}

// Espelha ConvertLeadDto (crm-backend) — exatamente um dos dois campos.
export interface ConvertLeadInput {
  customer_id?: string;
  customer?: {
    name: string;
    document?: string;
    primary_phone?: string;
    primary_email?: string;
  };
}
