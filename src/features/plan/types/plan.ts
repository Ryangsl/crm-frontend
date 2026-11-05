export type CommercialState =
  'active' | 'trial_not_started' | 'trial_active' | 'trial_expired' | 'suspended' | 'deleted';

export type LimitedResource = 'users' | 'leads' | 'customers' | 'opportunities' | 'storage_bytes';

export interface TrialSituation {
  started_at: string | null;
  ends_at: string | null;
  total_days: number | null;
  days_remaining: number | null;
  near_expiry: boolean;
}

export interface PlanSituation {
  plan: { code: string | null; name: string };
  tenant_status: 'active' | 'trial' | 'suspended';
  state: CommercialState;
  write_allowed: boolean;
  trial: TrialSituation | null;
  limits: Record<LimitedResource, number | null>;
  features: Record<string, boolean>;
}

export interface ResourceUsage {
  resource: LimitedResource;
  // Nulo quando o consumo não é medido (`monitored: false`): hoje, o armazenamento.
  used: number | null;
  limit: number | null;
  percent: number | null;
  state: 'normal' | 'warning' | 'reached';
  monitored: boolean;
}

export interface PlanUsage {
  warning_percent: number;
  resources: ResourceUsage[];
}
