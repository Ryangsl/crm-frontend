// F4.5 v1 — espelha o contrato do backend (docs/05-api/openapi.yaml). Hoje o unico `type`
// emitido e `lead.assigned`; o campo e texto livre para novos tipos nao exigirem mudanca de
// contrato (a UI cai num texto generico para tipos desconhecidos).
export interface AppNotification {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  data: AppNotification[];
  next_cursor: string | null;
}

export interface UnreadCount {
  count: number;
}

export interface ReadAllResult {
  updated: number;
}
