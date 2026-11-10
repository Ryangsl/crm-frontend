// Espelha LeadImportResponseDto e LeadImportRowResponseDto (crm-backend, D-096).
export type LeadImportStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type LeadImportRowStatus = 'pending' | 'created' | 'skipped' | 'failed';

export type LeadImportFailure =
  | 'importer_inactive'
  | 'permission_revoked'
  | 'plan_blocked'
  | 'source_unavailable'
  | 'owner_unavailable'
  | 'queue_unavailable'
  | 'processing_error';

export type LeadImportRowReason =
  | 'invalid_document'
  | 'invalid_phone'
  | 'invalid_email'
  | 'missing_identification'
  | 'duplicate'
  | 'plan_limit_reached';

export interface LeadImport {
  id: string;
  status: LeadImportStatus;
  file_name: string;
  source_id: string;
  owner_id: string | null;
  created_by: { id: string; name: string };
  total_rows: number;
  processed_rows: number;
  created_count: number;
  skipped_count: number;
  error_count: number;
  failure_code: LeadImportFailure | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface LeadImportRow {
  row: number;
  status: LeadImportRowStatus;
  data: {
    name: string | null;
    document: string | null;
    phone: string | null;
    email: string | null;
  };
  lead_id: string | null;
  reason: LeadImportRowReason | null;
  processed_at: string | null;
}

export interface OffsetPage<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
