// Espelha o contrato de GET/PUT /v1/tenant-settings/business-hours (crm-backend, F4.1).
// Formato v1 versionado: PROPOSTA do plano da Fase 4 — VN-07 (feriados, regras de acesso,
// efeito na distribuicao) segue pendente e nao esta representado aqui.

export interface BusinessHoursWindow {
  // ISO-8601: 1 = segunda ... 7 = domingo.
  days: number[];
  // "HH:mm" (24h).
  start: string;
  end: string;
}

export interface BusinessHours {
  schema_version: 1;
  // Nome IANA (ex.: America/Sao_Paulo).
  timezone: string;
  weekly: BusinessHoursWindow[];
}

export interface BusinessHoursResponse {
  configured: boolean;
  business_hours: BusinessHours | null;
  updated_at: string | null;
}
