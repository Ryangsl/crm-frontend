import { ApiError } from '@/services/api';
import type { ClosingReason, ClosingReasonChoice } from './types';

export interface ChoiceDraft {
  reasonId: string;
  note: string;
}

export const EMPTY_CHOICE: ChoiceDraft = { reasonId: '', note: '' };
export const NOTE_MIN_LENGTH = 3;
export const NOTE_MAX_LENGTH = 1000;

export function selectedReason(
  reasons: ClosingReason[] | undefined,
  draft: ChoiceDraft,
): ClosingReason | undefined {
  return reasons?.find((reason) => reason.id === draft.reasonId);
}

// O backend decide (D-099); isto so antecipa o que ele recusaria: sem motivo, ou "Outro" sem
// justificativa.
export function isChoiceComplete(
  reasons: ClosingReason[] | undefined,
  draft: ChoiceDraft,
): boolean {
  const reason = selectedReason(reasons, draft);
  if (!reason) return false;
  return !reason.is_other || draft.note.trim().length >= NOTE_MIN_LENGTH;
}

export function toChoice(draft: ChoiceDraft): ClosingReasonChoice {
  const note = draft.note.trim();
  return { reason_id: draft.reasonId, ...(note ? { note } : {}) };
}

export function choiceErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'CLOSING_REASON_INVALID') {
    return 'Este motivo não está mais na lista. Escolha outro e envie novamente.';
  }
  if (error.code === 'CLOSING_REASON_NOTE_REQUIRED') {
    return 'O motivo "Outro" exige uma justificativa.';
  }
  return null;
}
