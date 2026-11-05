import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { usePlanUsageQuery } from '../hooks/usePlan';
import { formatAmount, resourceLabel } from '../lib/labels';
import type { ResourceUsage } from '../types/plan';

const BAR_BY_STATE: Record<ResourceUsage['state'], string> = {
  normal: 'bg-brand-500',
  warning: 'bg-warning',
  reached: 'bg-danger',
};

const STATE_TEXT: Partial<Record<ResourceUsage['state'], string>> = {
  warning: 'Próximo do limite',
  reached: 'Limite atingido',
};

// Sem medição (hoje, o armazenamento): informa o limite configurado, nunca um consumo presumido.
function UnmonitoredRow({ usage }: { usage: ResourceUsage }) {
  const { resource, limit } = usage;
  return (
    <li data-testid={`usage-${resource}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-900">{resourceLabel(resource)}</span>
        <span className="text-neutral-500">
          {limit === null ? 'Sem limite' : `${formatAmount(resource, limit)} configurados`}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">Consumo ainda não monitorado</p>
    </li>
  );
}

function UsageRow({ usage }: { usage: ResourceUsage }) {
  const { resource, used, limit, percent, state, monitored } = usage;
  if (!monitored || used === null) return <UnmonitoredRow usage={usage} />;
  return (
    <li data-testid={`usage-${resource}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-900">{resourceLabel(resource)}</span>
        <span className="text-neutral-500">
          {formatAmount(resource, used)}
          {limit === null ? ' (sem limite)' : ` / ${formatAmount(resource, limit)}`}
        </span>
      </div>
      {limit !== null && (
        <div
          role="progressbar"
          aria-label={`Consumo de ${resourceLabel(resource)}`}
          aria-valuenow={Math.min(percent ?? 0, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-surface-muted mt-1 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className={`h-full rounded-full ${BAR_BY_STATE[state]}`}
            style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
          />
        </div>
      )}
      {STATE_TEXT[state] && <p className="mt-0.5 text-xs text-neutral-500">{STATE_TEXT[state]}</p>}
    </li>
  );
}

// Consumo e limites. Depende de `plan:read`: sem ela o componente não aparece (o backend devolveria 403).
export function UsageIndicators({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError, refetch } = usePlanUsageQuery(enabled);
  if (!enabled) return null;
  if (isLoading) return <Spinner />;
  if (isError || !data) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o consumo">
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    );
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="usage-indicators">
      {data.resources.map((usage) => (
        <UsageRow key={usage.resource} usage={usage} />
      ))}
    </ul>
  );
}
