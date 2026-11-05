import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/useAuth';
import { TrialBanner } from '@/features/plan/components/TrialBanner';
import { UsageIndicators } from '@/features/plan/components/UsageIndicators';
import { usePlanQuery } from '@/features/plan/hooks/usePlan';

const SHORTCUTS = [
  { to: '/customers', label: 'Clientes' },
  { to: '/leads', label: 'Leads' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/opportunities', label: 'Oportunidades' },
  { to: '/plan', label: 'Plano' },
];

// Painel inicial básico. Indicadores de vendas e atendimento são da Fase 7 (Dashboard).
export function HomePage() {
  const { user, hasPermission } = useAuth();
  const { data } = usePlanQuery();
  const inTrial = data?.tenant_status === 'trial';
  const canReadUsage = inTrial && hasPermission('plan:read');

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Início</h1>
        {user && <p className="text-sm text-neutral-500">Olá, {user.name}.</p>}
      </header>

      {data && <TrialBanner situation={data} />}

      {canReadUsage && (
        <Card title="Consumo da avaliação">
          <UsageIndicators enabled={canReadUsage} />
        </Card>
      )}

      <Card title="Acesso rápido">
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.to}>
              <Link
                to={shortcut.to}
                className="min-h-touch border-border-subtle hover:bg-surface-muted flex items-center justify-center rounded-lg border px-3 text-sm text-neutral-900"
              >
                {shortcut.label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
