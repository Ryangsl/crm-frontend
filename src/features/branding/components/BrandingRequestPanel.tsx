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

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function requestError(error: unknown): string {
  if (error instanceof ApiError && error.details.length > 0) return error.details[0].issue;
  return 'Não foi possível enviar a solicitação. Tente novamente.';
}

// Solicitacao de alteracao da identidade. O Admin da empresa pede; a equipe do CRM Universal aplica.
// `canRequest` e `canDismiss` vem das permissoes; o backend decide de qualquer forma.
export function BrandingRequestPanel({
  canRequest,
  canDismiss,
  onSent,
}: {
  canRequest: boolean;
  canDismiss: boolean;
  onSent?: () => void;
}) {
  const request = useBrandingRequestQuery();
  const create = useCreateBrandingRequest();
  const dismiss = useDismissBrandingRequest();
  const [message, setMessage] = useState('');
  const pending = request.data?.pending ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await create.mutateAsync(message);
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
          className="bg-info-soft border-brand-200 rounded-control border p-3"
          data-testid="pending-request"
        >
          <p className="text-xs text-neutral-500">
            Enviada em {DATE_TIME.format(new Date(pending.requested_at))}
            {pending.requested_by.name ? ` por ${pending.requested_by.name}` : ''}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-neutral-900">{pending.message}</p>
          {canDismiss && (
            <Button
              writes
              size="sm"
              variant="secondary"
              className="mt-2"
              loading={dismiss.isPending}
              onClick={() => void dismiss.mutateAsync().catch(() => undefined)}
            >
              Encerrar sem aplicar
            </Button>
          )}
        </div>
      )}

      {canRequest && (
        <form
          onSubmit={(event) => void submit(event).catch(() => undefined)}
          className="mt-4 flex flex-col gap-2"
        >
          <Textarea
            label={pending ? 'Substituir a solicitação' : 'Descreva o que deseja alterar'}
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ex.: usar o verde da nossa marca nos botões e na barra lateral."
          />
          {create.isError && (
            <p role="alert" className="text-danger text-sm">
              {requestError(create.error)}
            </p>
          )}
          <div>
            <Button
              writes
              type="submit"
              loading={create.isPending}
              disabled={message.trim().length < 10}
            >
              <Send aria-hidden="true" className="size-4" /> Enviar solicitação
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
