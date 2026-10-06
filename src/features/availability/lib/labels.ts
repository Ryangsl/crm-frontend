import type { AvailabilityStatus } from '../types/availability';

// Rotulos em portugues (identificadores seguem em ingles, como no backend).
export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Disponivel',
  unavailable: 'Indisponivel',
  break: 'Pausa',
  lunch: 'Almoco',
  training: 'Treinamento',
};

// Estados que o proprio usuario pode escolher. Treinamento nunca esta aqui: so Admin/Gerente
// colocam e retiram (D-071/VN-05).
export const SELF_STATUSES: AvailabilityStatus[] = ['available', 'unavailable', 'break', 'lunch'];

export const ALL_STATUSES: AvailabilityStatus[] = [...SELF_STATUSES, 'training'];

export function formatSince(since: string | null): string {
  if (!since) return 'sem registro';
  return new Date(since).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
