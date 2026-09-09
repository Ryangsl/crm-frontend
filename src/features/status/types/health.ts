// Espelha o retorno de GET /health do crm-backend (@nestjs/terminus).
export type HealthStatus = 'ok' | 'error' | 'shutting_down';

export interface HealthResponse {
  status: HealthStatus;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
  details?: Record<string, { status: string }>;
}
