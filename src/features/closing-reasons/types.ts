// Espelha ClosingReasonResponseDto e ClosingReasonChoiceDto (crm-backend, D-099).
export type ClosingReasonKind = 'opportunity_lost' | 'lead_disqualified';

export interface ClosingReason {
  id: string;
  kind: ClosingReasonKind;
  name: string;
  // "Outro": exige justificativa e nao pode ser renomeado nem excluido.
  is_other: boolean;
  created_at: string;
  updated_at: string;
}

// Corpo de "perder Oportunidade" e de "desqualificar Lead".
export interface ClosingReasonChoice {
  reason_id: string;
  note?: string;
}
