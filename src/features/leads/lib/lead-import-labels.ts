import type { BadgeTone } from '@/components/ui/Badge';
import type {
  LeadImportFailure,
  LeadImportRowReason,
  LeadImportRowStatus,
  LeadImportStatus,
} from '../types/lead-import';

export const IMPORT_STATUS: Record<LeadImportStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: 'Na fila', tone: 'neutral' },
  processing: { label: 'Processando', tone: 'info' },
  completed: { label: 'Concluída', tone: 'success' },
  failed: { label: 'Interrompida', tone: 'danger' },
};

export const ROW_STATUS: Record<LeadImportRowStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendente', tone: 'neutral' },
  created: { label: 'Importada', tone: 'success' },
  skipped: { label: 'Já cadastrada', tone: 'warning' },
  failed: { label: 'Com erro', tone: 'danger' },
};

export const ROW_REASON: Record<LeadImportRowReason, string> = {
  invalid_document: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.',
  invalid_phone: 'Telefone inválido.',
  invalid_email: 'E-mail inválido.',
  missing_identification: 'Linha sem nome, documento, telefone nem e-mail.',
  duplicate: 'Já existe um lead com este documento, telefone ou e-mail.',
  plan_limit_reached: 'Limite de leads do plano atingido.',
};

export const FAILURE_MESSAGE: Record<LeadImportFailure, string> = {
  importer_inactive: 'Quem enviou o arquivo foi desativado ou a empresa não pode mais acessar.',
  permission_revoked: 'Quem enviou o arquivo não tem mais permissão para criar e ver leads.',
  plan_blocked: 'O plano da empresa não permite mais importar leads.',
  source_unavailable: 'A origem escolhida foi excluída durante a importação.',
  owner_unavailable: 'O responsável escolhido não existe mais na empresa.',
  queue_unavailable: 'Não foi possível iniciar o processamento. Envie o arquivo novamente.',
  processing_error:
    'Um erro inesperado interrompeu o processamento. Envie as linhas pendentes novamente.',
};

export function rowReasonLabel(reason: string | null): string {
  if (!reason) return '';
  return ROW_REASON[reason as LeadImportRowReason] ?? reason;
}

export function failureMessage(code: string | null): string {
  if (!code) return '';
  return FAILURE_MESSAGE[code as LeadImportFailure] ?? 'A importação foi interrompida.';
}
