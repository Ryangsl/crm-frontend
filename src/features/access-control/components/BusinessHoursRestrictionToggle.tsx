import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { useRestrictionSettingQuery, useSetRestriction } from '../hooks/useAccessControl';
import { accessControlErrorMessage } from '../lib/labels';

interface Props {
  // Ha horario valido gravado? O backend recusa ativar sem ele (422); aqui so orienta a UX.
  hoursConfigured: boolean;
}

// F4.7 (D-082): toggle GLOBAL da restricao por horario. So o Admin (tenant_settings:update) liga
// ou desliga; quem apenas le (tenant_settings:read) ve o estado. O Gerente nao controla o toggle
// (so concede/lista/revoga excecoes). Desligado por padrao. UX apenas: o backend valida tudo.
export function BusinessHoursRestrictionToggle({ hoursConfigured }: Props) {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('tenant_settings:read');
  const canUpdate = hasPermission('tenant_settings:update');
  const query = useRestrictionSettingQuery(canRead);
  const mutation = useSetRestriction();
  const [error, setError] = useState<string | null>(null);

  if (!canRead) return null;

  const enabled = query.data?.enabled === true;

  async function toggle() {
    setError(null);
    try {
      await mutation.mutateAsync(!enabled);
    } catch (err) {
      setError(accessControlErrorMessage(err, 'Não foi possível alterar a restrição por horário.'));
    }
  }

  return (
    <Card title="Restrição de acesso por horário">
      <p className="mb-3 text-sm text-neutral-700">
        Quando ligada, vendedores ficam sem acesso a Leads e Conversas fora do horário de
        funcionamento. Admin, Gerente, Supervisor e Diretor não são afetados. Não altera a
        disponibilidade nem a distribuição de leads. Fica desligada até o Admin ativá-la.
      </p>

      {query.isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando...
        </p>
      )}

      {query.isError && (
        <Alert tone="danger" title="Não foi possível carregar a restrição">
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      {query.data && (
        <div className="flex flex-col gap-3">
          <p data-testid="restriction-state" className="font-medium text-neutral-900">
            Restrição por horário: {enabled ? 'ligada' : 'desligada'}
          </p>

          {error && (
            <Alert tone="danger" title="Não foi possível concluir">
              {error}
            </Alert>
          )}

          {canUpdate ? (
            <div className="flex flex-col gap-2">
              {!enabled && !hoursConfigured && (
                <Alert tone="info">
                  Salve um horário de funcionamento válido acima para poder ligar a restrição.
                </Alert>
              )}
              <div>
                <Button
                  writes
                  size="sm"
                  variant={enabled ? 'secondary' : 'primary'}
                  loading={mutation.isPending}
                  disabled={mutation.isPending || (!enabled && !hoursConfigured)}
                  onClick={() => void toggle()}
                >
                  {enabled ? 'Desligar restrição' : 'Ligar restrição'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              Somente o Admin pode ligar ou desligar a restrição.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
