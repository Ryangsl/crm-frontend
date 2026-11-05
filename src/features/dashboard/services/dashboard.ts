import { apiGet } from '@/services/api';

export type DashboardPeriod = 7 | 30 | 90;

export interface EvolutionPoint {
  date: string;
  leads: number | null;
  opportunities: number | null;
  won: number | null;
}

export interface PipelineSummary {
  id: string;
  name: string;
  total_value: number;
  total_count: number;
  stages: Array<{ id: string; name: string; count: number; value: number; percent: number }>;
}

// Bloco nulo = o usuario nao tem a leitura daquele recurso.
export interface DashboardSummary {
  period_days: number;
  generated_at: string;
  customers: { total: number; delta_percent: number | null } | null;
  leads: { total: number; delta_percent: number | null } | null;
  opportunities: {
    open_count: number;
    open_value: number;
    count_delta_percent: number | null;
    value_delta_percent: number | null;
  } | null;
  pipeline: PipelineSummary | null;
  evolution: { bucket: 'day' | 'week'; points: EvolutionPoint[] } | null;
}

export function getDashboardSummary(period: DashboardPeriod): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>(`/v1/dashboard/summary?period_days=${period}`);
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function formatBrl(value: number): string {
  return BRL.format(value);
}
