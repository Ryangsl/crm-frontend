import { apiGet, apiPost } from '@/services/api';
import type { PlanSituation, PlanUsage } from '../types/plan';

export function getPlanSituation(): Promise<PlanSituation> {
  return apiGet<PlanSituation>('/v1/plan');
}

export function getPlanUsage(): Promise<PlanUsage> {
  return apiGet<PlanUsage>('/v1/plan/usage');
}

export function startTrial(): Promise<PlanSituation> {
  return apiPost<PlanSituation>('/v1/plan/trial/start');
}
