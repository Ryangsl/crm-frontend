import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { TrialBanner } from '../components/TrialBanner';
import { UsageIndicators } from '../components/UsageIndicators';
import { usePlanQuery } from '../hooks/usePlan';
import { includedFeatureLabels } from '../lib/labels';

// Não há checkout: contratar é falar com o comercial. O link vem da configuração do ambiente.
function HireSection() {
  const salesUrl = import.meta.env.VITE_SALES_CONTACT_URL as string | undefined;
  return (
    <Card title="Contratar um plano">
      <p className="text-sm text-neutral-700">
        Ao contratar, sua empresa, seus usuários e todos os dados continuam exatamente como estão.
      </p>
      {salesUrl ? (
        <a
          href={salesUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand-700 mt-2 inline-block font-medium underline"
        >
          Falar com o comercial
        </a>
      ) : (
        <p className="mt-2 text-sm text-neutral-700">
          Fale com o seu contato comercial para conhecer os planos disponíveis.
        </p>
      )}
    </Card>
  );
}

export function PlanPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading, isError, refetch } = usePlanQuery();

  if (isLoading) return <Spinner />;
  if (isError || !data) {
    return (
      <Alert tone="danger" title="Não foi possível carregar a situação do plano">
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  const canReadUsage = hasPermission('plan:read');
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Plano</h1>
        <p className="text-sm text-neutral-500">Plano atual: {data.plan.name}</p>
      </header>

      <TrialBanner situation={data} />

      {canReadUsage && (
        <Card title="Consumo">
          <UsageIndicators enabled={canReadUsage} />
        </Card>
      )}

      <Card title="Incluído no plano">
        <ul className="list-inside list-disc text-sm text-neutral-700">
          {includedFeatureLabels(data.features).map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </Card>

      {data.state !== 'active' && <HireSection />}
    </div>
  );
}
