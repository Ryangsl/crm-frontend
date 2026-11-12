import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { BusinessHoursForm } from '../components/BusinessHoursForm';
import { BusinessHoursRestrictionToggle } from '@/features/access-control/components/BusinessHoursRestrictionToggle';
import { useBusinessHoursQuery } from '../hooks/useBusinessHours';
import type { BusinessHours } from '../types/businessHours';

// Ponto de partida editavel quando o tenant ainda nao configurou nada. Nada e gravado ate o
// usuario clicar em "Salvar".
const SUGGESTED: BusinessHours = {
  schema_version: 1,
  timezone: 'America/Sao_Paulo',
  weekly: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }],
};

// F4.1: configuracao administrativa do horario de funcionamento (`crm.business_hours`). So
// UX de RBAC — o backend valida `tenant_settings:read|update` em toda chamada.
export function BusinessHoursPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('tenant_settings:read');
  const canUpdate = hasPermission('tenant_settings:update');
  const { data, isPending, isError, error, refetch } = useBusinessHoursQuery(canRead);

  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Horário de funcionamento
        </h1>
        <Alert tone="warning" title="Acesso restrito">
          Você não tem permissão para acessar as configurações da empresa.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Horário de funcionamento
        </h1>
        <p className="text-sm text-neutral-500">
          Janelas semanais de funcionamento da empresa, no fuso horário escolhido.
        </p>
      </header>

      <Alert tone="info">
        O horário nunca altera a distribuição de leads nem o status de ninguém. Ele só restringe o
        acesso de vendedores a Leads e Conversas se o Admin ligar a restrição por horário, mais
        abaixo (desligada por padrão).
      </Alert>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando configuração...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Não foi possível carregar">
          <p>
            {error instanceof ApiError && error.status === 403
              ? 'Você não tem permissão para acessar as configurações da empresa.'
              : 'Não foi possível carregar o horário de funcionamento.'}
          </p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}

      {data && (
        <Card>
          {!data.configured && (
            <p className="mb-3">
              Nenhum horário configurado ainda. Ajuste a sugestão abaixo e salve para registrar.
            </p>
          )}
          {!canUpdate && (
            <p className="mb-3">Você pode consultar, mas não alterar esta configuração.</p>
          )}
          {/* Sem `key`: o formulario guarda o proprio estado apos a montagem, entao salvar nao o
              remonta (a confirmacao permanece) e um refetch nao sobrescreve edicoes em curso. */}
          <BusinessHoursForm initial={data.business_hours ?? SUGGESTED} readOnly={!canUpdate} />
        </Card>
      )}

      {data && <BusinessHoursRestrictionToggle hoursConfigured={data.configured} />}
    </div>
  );
}
