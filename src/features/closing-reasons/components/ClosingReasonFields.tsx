import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { NOTE_MAX_LENGTH, selectedReason } from '../choice';
import type { ChoiceDraft } from '../choice';
import { useClosingReasonsQuery } from '../hooks';
import type { ClosingReasonKind } from '../types';

interface Props {
  kind: ClosingReasonKind;
  // Rotulo do seletor: "Motivo da perda" ou "Motivo da desqualificação".
  label: string;
  value: ChoiceDraft;
  onChange: (next: ChoiceDraft) => void;
}

// D-099: o motivo vem da lista da empresa; a observacao e opcional e vira justificativa
// obrigatoria quando o motivo e "Outro". Usado ao perder Oportunidade e ao desqualificar Lead.
export function ClosingReasonFields({ kind, label, value, onChange }: Props) {
  const { data, isPending, isError, refetch } = useClosingReasonsQuery(kind);
  const reasons = data?.data;
  const isOther = selectedReason(reasons, value)?.is_other ?? false;

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-neutral-600">
        <Spinner size="sm" /> Carregando motivos...
      </p>
    );
  }

  if (isError) {
    return (
      <Alert tone="danger" title="Não foi possível carregar os motivos">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={() => void refetch()}
        >
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  if (!reasons || reasons.length === 0) {
    return (
      <Alert tone="warning" title="Nenhum motivo cadastrado">
        Peça ao administrador para cadastrar os motivos em{' '}
        <Link to="/settings/closing-reasons" className="text-brand-700 hover:underline">
          Configurações &gt; Motivos
        </Link>
        .
      </Alert>
    );
  }

  return (
    <>
      <Select
        label={label}
        required
        value={value.reasonId}
        onChange={(event) => onChange({ ...value, reasonId: event.target.value })}
      >
        <option value="">Selecione</option>
        {reasons.map((reason) => (
          <option key={reason.id} value={reason.id}>
            {reason.name}
          </option>
        ))}
      </Select>
      <Textarea
        label={isOther ? 'Justificativa' : 'Observação (opcional)'}
        required={isOther}
        maxLength={NOTE_MAX_LENGTH}
        rows={2}
        value={value.note}
        onChange={(event) => onChange({ ...value, note: event.target.value })}
      />
      {isOther && (
        <p className="-mt-2 text-sm text-neutral-500">
          Com o motivo "Outro", descreva o que aconteceu (mínimo de 3 caracteres).
        </p>
      )}
    </>
  );
}
