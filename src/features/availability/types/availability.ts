// Espelha o contrato de /v1/availability (crm-backend, F4.2 — D-071/D-077).

export type AvailabilityStatus = 'available' | 'unavailable' | 'break' | 'lunch' | 'training';

export interface MyAvailability {
  // Espelho de crm.availability.enabled: o seletor so existe com o mecanismo habilitado.
  enabled: boolean;
  status: AvailabilityStatus;
  // Nulo quando o usuario nunca teve transicao (sem registro = unavailable).
  since: string | null;
}

export interface AvailabilityListItem {
  user_id: string;
  name: string;
  status: AvailabilityStatus;
  since: string | null;
}

export interface AvailabilityListResponse {
  data: AvailabilityListItem[];
  page: number;
  limit: number;
  total: number;
}

export interface ListAvailabilityParams {
  page?: number;
  limit?: number;
  status?: AvailabilityStatus;
}
