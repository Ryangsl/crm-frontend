import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { useAvailabilitySettingQuery, useSetAvailabilitySetting } from '../hooks/useAvailability';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN')
      return 'Somente o Admin pode ligar ou desligar a disponibilidade.';
    return error.message || 'Não foi possível alterar a disponibilidade.';
  }
  return 'Não foi possível alterar a disponibilidade.';
}

// Mecanismo de disponibilidade da empresa (D-071, D-077, D-078). Desligado por padrão; só o Admin
// (`tenant_settings:update`) liga ou desliga. A tela só explica os efeitos: quem decide é o backend.
export function AvailabilitySettingsPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('tenant_settings:read');
  const canUpdate = hasPermission('tenant_settings:update');
  const query = useAvailabilitySettingQuery(canRead);
  const mutation = useSetAvailabilitySetting();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const enabled = query.data?.enabled === true;

  async function toggle() {
    setError(null);
    setSaved(null);
    try {
      const result = await mutation.mutateAsync(!enabled);
      setSaved(result.enabled ? 'Disponibilidade ligada.' : 'Disponibilidade desligada.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Breadcrumb
          items={[{ label: 'Configurações', to: '/settings' }, { label: 'Disponibilidade' }]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Disponibilidade da equipe
        </h1>
        <p className="text-sm text-neutral-500">
          Cada pessoa informa se está disponível para receber novos leads.
        </p>
      </header>

      {!canRead && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver as configurações da empresa.
        </Alert>
      )}

      {canRead && (
        <Card title="Mecanismo de disponibilidade" className="max-w-2xl">
          {query.isPending && (
            <p className="flex items-center gap-2 text-neutral-600">
              <Spinner size="sm" /> Carregando...
            </p>
          )}

          {query.isError && (
            <Alert tone="danger" title="Não foi possível carregar a configuração">
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
            <div className="flex flex-col gap-3 text-sm text-neutral-700">
              <p data-testid="availability-setting-state" className="font-medium text-neutral-900">
                Disponibilidade: {enabled ? 'ligada' : 'desligada'}
              </p>

              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Ligada:</strong> cada pessoa escolhe o próprio estado (Disponível, Pausa,
                  Almoço ou Indisponível) e a distribuição automática entrega novos leads só a quem
                  está Disponível. Treinamento é colocado e retirado pelo Admin ou pelo Gerente.
                </li>
                <li>
                  <strong>Desligada:</strong> o seletor some e a distribuição considera só as
                  pessoas ativas com permissão sobre leads. Os estados já registrados ficam
                  guardados e voltam quando a disponibilidade for ligada de novo.
                </li>
                <li>
                  Ficar indisponível não retira os leads que a pessoa já tem, e o horário de
                  funcionamento não muda a disponibilidade de ninguém.
                </li>
              </ul>

              {!enabled && canUpdate && (
                <Alert tone="info">
                  Ao ligar, quem nunca informou um estado começa como Indisponível. Enquanto ninguém
                  estiver Disponível, os novos leads ficam sem responsável até serem atribuídos.
                </Alert>
              )}

              {error && (
                <Alert tone="danger" title="Não foi possível concluir">
                  {error}
                </Alert>
              )}
              {saved && <Alert tone="success">{saved}</Alert>}

              {canUpdate ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    writes
                    size="sm"
                    variant={enabled ? 'secondary' : 'primary'}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                    onClick={() => void toggle()}
                  >
                    {enabled ? 'Desligar disponibilidade' : 'Ligar disponibilidade'}
                  </Button>
                  {enabled && (
                    <Link
                      to="/team/availability"
                      className="text-brand-700 text-sm font-medium hover:underline"
                    >
                      Ver a equipe
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-neutral-600">
                  Somente o Admin pode ligar ou desligar a disponibilidade.
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
