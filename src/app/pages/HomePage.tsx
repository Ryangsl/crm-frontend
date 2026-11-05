import { useQuery } from '@tanstack/react-query';
import { Contact, Handshake, RefreshCw, UserRoundSearch, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { StatusIndicator } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import {
  GoalsCard,
  LatestLeadsCard,
  PipelineCard,
  TodayCard,
} from '@/features/dashboard/components/DashboardCards';
import { EvolutionChart } from '@/features/dashboard/components/EvolutionChart';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { formatBrl, getDashboardSummary } from '@/features/dashboard/services/dashboard';
import type { DashboardPeriod } from '@/features/dashboard/services/dashboard';
import { TrialBanner } from '@/features/plan/components/TrialBanner';
import { UsageIndicators } from '@/features/plan/components/UsageIndicators';
import { usePlanQuery } from '@/features/plan/hooks/usePlan';
import { useHealth } from '@/features/status/hooks/useHealth';

const TODAY = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });

// Painel inicial. Todo numero vem da API: o que nao existe ou o usuario nao pode ler nao aparece.
export function HomePage() {
  const { user, hasPermission } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>(30);
  const plan = usePlanQuery();
  const health = useHealth();
  const summary = useQuery({
    queryKey: ['dashboard', 'summary', period],
    queryFn: () => getDashboardSummary(period),
  });
  const data = summary.data;
  const canReadUsage = plan.data?.tenant_status === 'trial' && hasPermission('plan:read');
  const firstName = user?.name.split(' ')[0];

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 lg:text-3xl">
            Olá{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-neutral-500">Aqui está o resumo do seu dia no CRM Universal.</p>
        </div>
        <div className="flex items-end gap-3">
          <p className="hidden pb-2.5 text-sm text-neutral-500 first-letter:uppercase xl:block">
            {TODAY.format(new Date())}
          </p>
          <div className="w-40">
            <Select
              label="Período"
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value) as DashboardPeriod)}
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </Select>
          </div>
        </div>
      </header>

      {plan.data && plan.data.tenant_status === 'trial' && <TrialBanner situation={plan.data} />}

      {summary.isError && (
        <Alert tone="danger" title="Não foi possível carregar o resumo">
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => void summary.refetch()}
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      {summary.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="rounded-card h-28" />
          ))}
        </div>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          {data.leads && (
            <KpiCard
              label="Leads"
              value={String(data.leads.total)}
              deltaPercent={data.leads.delta_percent}
              Icon={UserRoundSearch}
              to="/leads"
            />
          )}
          {data.customers && (
            <KpiCard
              label="Clientes"
              value={String(data.customers.total)}
              deltaPercent={data.customers.delta_percent}
              Icon={Contact}
              to="/customers"
            />
          )}
          {data.opportunities && (
            <KpiCard
              label="Oportunidades em aberto"
              value={String(data.opportunities.open_count)}
              deltaPercent={data.opportunities.count_delta_percent}
              Icon={Handshake}
              to="/opportunities"
            />
          )}
          {data.opportunities && (
            <KpiCard
              label="Valor em aberto"
              value={formatBrl(data.opportunities.open_value)}
              deltaPercent={data.opportunities.value_delta_percent}
              Icon={Wallet}
              to="/pipeline"
            />
          )}
        </div>
      )}

      {data && (data.evolution || data.opportunities) && (
        <div className="grid gap-4 xl:grid-cols-3">
          {data.evolution && (
            <Card title="Desempenho comercial" className="xl:col-span-2">
              <EvolutionChart points={data.evolution.points} />
            </Card>
          )}
          {data.opportunities && <PipelineCard pipeline={data.pipeline} />}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TodayCard />
        <LatestLeadsCard />
        <GoalsCard />
      </div>

      {canReadUsage && (
        <Card
          title="Consumo da avaliação"
          action={
            <Link to="/plan" className="text-brand-700 text-xs font-medium hover:underline">
              Ver plano
            </Link>
          }
        >
          <UsageIndicators enabled={canReadUsage} />
        </Card>
      )}

      <footer className="border-border-subtle flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-neutral-500">
        {health.data ? (
          <Link to="/status">
            <StatusIndicator
              tone={health.data.status === 'ok' ? 'success' : 'warning'}
              label={
                health.data.status === 'ok'
                  ? 'Sistema operando normalmente'
                  : 'Sistema com instabilidade'
              }
            />
          </Link>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-3">
          {data && <span>Atualizado em {new Date(data.generated_at).toLocaleString('pt-BR')}</span>}
          <Button size="sm" variant="ghost" onClick={() => void summary.refetch()}>
            <RefreshCw aria-hidden="true" className="size-3.5" /> Atualizar
          </Button>
        </span>
      </footer>
    </div>
  );
}
