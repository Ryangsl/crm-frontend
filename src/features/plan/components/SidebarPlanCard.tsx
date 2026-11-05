import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { usePlanQuery } from '../hooks/usePlan';
import { daysLabel } from '../lib/labels';

// Situacao da avaliacao na barra lateral. Plano contratado nao mostra nada aqui.
export function SidebarPlanCard() {
  const { data } = usePlanQuery();
  if (!data || data.tenant_status !== 'trial') return null;
  const { trial, state } = data;

  let summary = 'Avaliação não iniciada';
  let percent = 0;
  if (state === 'trial_expired') {
    summary = 'Avaliação encerrada';
    percent = 100;
  } else if (trial?.days_remaining != null && trial.total_days) {
    summary = daysLabel(trial.days_remaining);
    percent = ((trial.total_days - trial.days_remaining) / trial.total_days) * 100;
  }

  return (
    <div className="bg-sidebar-hover rounded-control p-3" data-testid="sidebar-plan-card">
      <p className="text-sidebar-ink flex items-center gap-2 text-sm font-medium">
        <Crown aria-hidden="true" className="size-4" /> Plano {data.plan.name}
      </p>
      <p className="text-sidebar-muted mt-1 mb-2 text-xs">{summary}</p>
      <ProgressBar
        label="Progresso da avaliação"
        percent={percent}
        barClassName="bg-sidebar-ink"
        trackClassName="bg-sidebar-border"
      />
      <Link to="/plan" className="text-sidebar-ink mt-2 inline-block text-xs font-medium underline">
        Ver detalhes
      </Link>
    </div>
  );
}
