import { Send } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/services/api';
import {
  useBrandingRequestQuery,
  useCreateBrandingRequest,
  useDismissBrandingRequest,
} from '../hooks/useBranding';
import type { Branding, BrandingColors, BrandingProposal, BrandingTheme } from '../types/branding';
import { BrandingEditorFields, Preview, Swatches, ThemeLabel } from './BrandingFields';

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function requestErrors(error: unknown): string[] {
  if (error instanceof ApiError && error.details.length > 0) {
    return error.details.map((detail) =>
      detail.field.startsWith('proposal.')
        ? `${detail.field.replace('proposal.', '')}: ${detail.issue}`
        : detail.issue,
    );
  }
  return ['Não foi possível enviar a solicitação. Tente novamente.'];
}

// Solicitacao de alteracao da identidade (D-086). O Admin da empresa propoe nome, tema e cores (com
// pre-visualizacao) e/ou escreve uma mensagem; a equipe do CRM Universal ve a proposta e decide aplicar
// (carregando-a no editor) ou encerrar. `canRequest`, `canDismiss` vem das permissoes; o backend decide.
export function BrandingRequestPanel({
  current,
  canRequest,
  canDismiss,
  onSent,
  onUseProposal,
}: {
  current: Branding;
  canRequest: boolean;
  canDismiss: boolean;
  onSent?: () => void;
  onUseProposal?: (proposal: BrandingProposal) => void;
}) {
  const request = useBrandingRequestQuery();
  const create = useCreateBrandingRequest();
  const dismiss = useDismissBrandingRequest();
  const [message, setMessage] = useState('');
  const [proposing, setProposing] = useState(true);
  const [name, setName] = useState(current.display_name);
  const [theme, setTheme] = useState<BrandingTheme>(current.theme);
  const [colors, setColors] = useState<BrandingColors>(current.colors);
  const pending = request.data?.pending ?? null;
  const trimmed = message.trim();
  const messageTooShort = trimmed.length > 0 && trimmed.length < 10;
  const canSend = (proposing || trimmed.length >= 10) && !messageTooShort;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await create.mutateAsync({
      ...(trimmed ? { message: trimmed } : {}),
      ...(proposing ? { proposal: { display_name: name.trim() || null, theme, colors } } : {}),
    });
    setMessage('');
    onSent?.();
  }

  return (
    <Card title="Solicitação de alteração">
      {request.isLoading && <Spinner />}
      {request.isError && (
        <Alert tone="danger" title="Não foi possível carregar a solicitação">
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => void request.refetch()}
          >
            Tentar novamente
          </Button>
        </Alert>
      )}
      {request.data && !pending && (
        <p className="text-neutral-500">Nenhuma solicitação em aberto.</p>
      )}
      {pending && (
        <div
          className="bg-info-soft border-brand-200 rounded-control flex flex-col gap-3 border p-3"
          data-testid="pending-request"
        >
          <p className="text-xs text-neutral-500">
            Enviada em {DATE_TIME.format(new Date(pending.requested_at))}
            {pending.requested_by.name ? ` por ${pending.requested_by.name}` : ''}
          </p>
          {pending.message && (
            <p className="whitespace-pre-wrap text-neutral-900">{pending.message}</p>
          )}
          {pending.proposal && (
            <div className="flex flex-col gap-3" data-testid="pending-proposal">
              <p className="text-sm text-neutral-700">
                Proposta: <strong>{pending.proposal.display_name ?? current.display_name}</strong>
                {' · tema '}
                <ThemeLabel theme={pending.proposal.theme} />
              </p>
              <Swatches colors={pending.proposal.colors} />
              <Preview
                name={pending.proposal.display_name ?? current.display_name}
                colors={pending.proposal.colors}
              />
            </div>
          )}
          {canDismiss && (
            <div className="flex flex-wrap gap-2">
              {pending.proposal && onUseProposal && (
                <Button size="sm" onClick={() => onUseProposal(pending.proposal!)}>
                  Carregar proposta no editor
                </Button>
              )}
              <Button
                writes
                size="sm"
                variant="secondary"
                loading={dismiss.isPending}
                onClick={() => void dismiss.mutateAsync().catch(() => undefined)}
              >
                Encerrar sem aplicar
              </Button>
            </div>
          )}
          {canDismiss && pending.proposal && (
            <p className="text-xs text-neutral-500">
              Para aprovar: carregue a proposta, revise e salve. Salvar aplica e encerra a
              solicitação.
            </p>
          )}
        </div>
      )}

      {canRequest && (
        <form
          onSubmit={(event) => void submit(event).catch(() => undefined)}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
            <input
              type="checkbox"
              checked={proposing}
              onChange={(event) => setProposing(event.target.checked)}
            />
            Propor nome, tema e cores
          </label>
          {proposing && (
            <div className="grid items-start gap-4 xl:grid-cols-3">
              <div className="flex flex-col gap-4 xl:col-span-2">
                <BrandingEditorFields
                  idPrefix="proposal"
                  name={name}
                  theme={theme}
                  colors={colors}
                  onName={setName}
                  onTheme={setTheme}
                  onColors={setColors}
                />
              </div>
              <Card title="Pré-visualização da proposta">
                <Preview name={name || current.display_name} colors={colors} />
              </Card>
            </div>
          )}
          <Textarea
            label={proposing ? 'Mensagem (opcional)' : 'Descreva o que deseja alterar'}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ex.: usar o verde da nossa marca nos botões e na barra lateral."
          />
          {messageTooShort && (
            <p className="text-xs text-neutral-500">
              A mensagem precisa de ao menos 10 caracteres.
            </p>
          )}
          {create.isError && (
            <Alert tone="danger" title="Ajuste a solicitação">
              <ul className="list-inside list-disc">
                {requestErrors(create.error).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </Alert>
          )}
          <div>
            <Button writes type="submit" loading={create.isPending} disabled={!canSend}>
              <Send aria-hidden="true" className="size-4" />{' '}
              {pending ? 'Substituir solicitação' : 'Enviar solicitação'}
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            A equipe do CRM Universal avalia e aplica a alteração. A identidade atual continua até
            lá.
          </p>
        </form>
      )}
    </Card>
  );
}
