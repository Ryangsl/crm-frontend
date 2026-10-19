// F4.7 — restricao de acesso por horario e liberacao excepcional (D-082/D-083). Espelha o
// contrato do backend (docs/05-api/openapi.yaml, rascunho decidido). Tipos so de transporte.
export type AccessExceptionScope = 'leads' | 'conversations' | 'all';

// Estado do acesso por horario do PROPRIO usuario autenticado (banner preventivo).
export interface AccessStatus {
  restriction_enabled: boolean;
  // Possui o marcador de restricao e nao o de isencao.
  applies_to_me: boolean;
  // Nulo quando a restricao esta desligada ou nao ha horario valido.
  within_business_hours: boolean | null;
  access: { leads: boolean; conversations: boolean };
}

export interface RestrictionSetting {
  enabled: boolean;
}

export interface AccessException {
  id: string;
  user_id: string;
  granted_by: string;
  scope: AccessExceptionScope;
  starts_at: string;
  expires_at: string;
  reason: string;
  revoked_at: string | null;
}

export interface AccessExceptionListResponse {
  data: AccessException[];
  page: number;
  limit: number;
  total: number;
}

export interface ListAccessExceptionsParams {
  page?: number;
  limit?: number;
  user_id?: string;
  // true = vigentes; false = revogadas ou expiradas; ausente = todas.
  active?: boolean;
}

export interface CreateAccessExceptionInput {
  user_id: string;
  scope: AccessExceptionScope;
  reason: string;
  // ISO 8601, obrigatoria e futura; sem teto de duracao.
  expires_at: string;
}

// Usuario selecionavel como destinatario (so quem tem `users:read` carrega a lista).
export interface AccessExceptionUserOption {
  id: string;
  name: string;
  status: string;
}

export interface AccessExceptionUsersResponse {
  data: AccessExceptionUserOption[];
}
