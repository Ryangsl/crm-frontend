import { ApiError } from '@/services/api';
import type { LimitedResource, PlanSituation } from '../types/plan';

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  users: 'Usuários',
  leads: 'Leads',
  customers: 'Clientes',
  opportunities: 'Oportunidades',
  storage_bytes: 'Armazenamento',
};

// Só o que existe no produto hoje. O backend devolve todas as chaves, inclusive as de funcionalidades
// ainda não construídas (sempre false): essas nunca são apresentadas.
const FEATURE_LABELS: Record<string, string> = {
  dashboard_basic: 'Painel inicial',
  customers: 'Clientes',
  leads: 'Leads',
  lead_distribution: 'Distribuição de Leads',
  pipeline: 'Pipeline',
  opportunities: 'Oportunidades',
  follow_ups: 'Notas, tarefas e compromissos',
  conversations: 'Conversas',
};

const MB = 1024 * 1024;

export function resourceLabel(resource: LimitedResource): string {
  return RESOURCE_LABELS[resource];
}

export function formatAmount(resource: LimitedResource, value: number): string {
  if (resource !== 'storage_bytes') return String(value);
  return `${Number((value / MB).toFixed(1))} MB`;
}

export function includedFeatureLabels(features: Record<string, boolean>): string[] {
  return Object.entries(FEATURE_LABELS)
    .filter(([key]) => features[key] === true)
    .map(([, label]) => label);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

export function daysLabel(days: number): string {
  return days === 1 ? '1 dia restante' : `${days} dias restantes`;
}

export function writeBlockReason(situation: PlanSituation | undefined): string | null {
  if (!situation || situation.write_allowed) return null;
  if (situation.state === 'trial_expired') {
    return 'Indisponível: o período de avaliação terminou. Os dados continuam disponíveis para consulta.';
  }
  if (situation.state === 'trial_not_started') {
    return 'Indisponível: o período de avaliação ainda não foi iniciado.';
  }
  return 'Indisponível na situação atual do plano.';
}

const PLAN_ERROR_CODES = [
  'TRIAL_EXPIRED',
  'TRIAL_NOT_STARTED',
  'PLAN_LIMIT_REACHED',
  'FEATURE_NOT_AVAILABLE',
];

// 403 de falta de permissão. Recusa por causa do plano também é 403, mas dizer "sem permissão" nesse
// caso seria falso: a mensagem do backend explica o motivo real.
export function isPermissionDenied(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 403 && !PLAN_ERROR_CODES.includes(error.code)
  );
}

export interface PlanLimitInfo {
  resource: LimitedResource;
  used: number;
  limit: number;
}

export type PlanErrorNotice =
  | { kind: 'limit'; info: PlanLimitInfo }
  | { kind: 'expired' }
  | { kind: 'not_started' }
  | { kind: 'feature' };

// Traduz os erros de plano da API para o aviso apresentado ao usuário.
export function toPlanErrorNotice(error: ApiError): PlanErrorNotice | null {
  if (error.status !== 403) return null;
  if (error.code === 'TRIAL_EXPIRED') return { kind: 'expired' };
  if (error.code === 'TRIAL_NOT_STARTED') return { kind: 'not_started' };
  if (error.code === 'FEATURE_NOT_AVAILABLE') return { kind: 'feature' };
  if (error.code === 'PLAN_LIMIT_REACHED') {
    const info = (error.body as { plan_limit?: PlanLimitInfo } | undefined)?.plan_limit;
    return info ? { kind: 'limit', info } : null;
  }
  return null;
}
