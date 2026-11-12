import type { ClosingReason, ClosingReasonKind } from './types';

// Lista de motivos para testes: um motivo comum e o "Outro".
export function reasonsOf(kind: ClosingReasonKind): { data: ClosingReason[] } {
  const base = { kind, created_at: '', updated_at: '' };
  const common = kind === 'opportunity_lost' ? 'Preço' : 'Sem perfil';
  return {
    data: [
      { ...base, id: `${kind}-1`, name: common, is_other: false },
      { ...base, id: `${kind}-other`, name: 'Outro', is_other: true },
    ],
  };
}
