export type OpportunityStatus = 'open' | 'won' | 'lost';

export interface Ref {
  id: string;
  name: string;
}

// `value` e um decimal EXATO em string ("1500.00") — nunca number: o backend guarda
// Decimal(14,2) e o frontend so faz aritmetica de exibicao, nunca de dinheiro.
export interface Opportunity {
  id: string;
  customer_id: string;
  customer: Ref;
  lead_id: string | null;
  pipeline_id: string;
  stage_id: string;
  owner_id: string;
  owner: Ref;
  value: string | null;
  status: OpportunityStatus;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityListResponse {
  data: Opportunity[];
  page: number;
  limit: number;
  total: number;
}

export interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  order: number;
  is_won: boolean;
  is_lost: boolean;
  requires_value: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages: Stage[];
  created_at: string;
  updated_at: string;
}

export interface PipelineListResponse {
  data: Pipeline[];
  page: number;
  limit: number;
  total: number;
}

// Espelha CreateOpportunityDto (crm-backend).
export interface OpportunityCreateInput {
  customer_id: string;
  pipeline_id: string;
  stage_id: string;
  lead_id?: string;
  value?: string;
}

export interface OpportunityUpdateInput {
  value?: string | null;
}

export interface MoveInput {
  stage_id: string;
  justification?: string;
}
