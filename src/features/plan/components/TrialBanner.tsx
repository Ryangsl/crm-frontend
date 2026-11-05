import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { daysLabel, formatDate } from '../lib/labels';
import type { PlanSituation } from '../types/plan';
import { StartTrialAction } from './StartTrialAction';

function PlansLink() {
  return (
    <Link to="/plan" className="text-brand-700 font-medium underline">
      Conhecer os planos
    </Link>
  );
}

function ActiveTrial({ situation }: { situation: PlanSituation }) {
  const { trial } = situation;
  if (!trial?.ends_at || trial.days_remaining === null || !trial.total_days) return null;
  const elapsed = Math.min(trial.total_days, trial.total_days - trial.days_remaining);
  const percent = Math.round((elapsed / trial.total_days) * 100);

  return (
    <Alert
      tone={trial.near_expiry ? 'warning' : 'info'}
      title={trial.near_expiry ? 'Sua avaliação está terminando' : 'Período de avaliação ativo'}
    >
      <p>
        {daysLabel(trial.days_remaining)}. Termina em {formatDate(trial.ends_at)}.
      </p>
      <div
        role="progressbar"
        aria-label="Progresso do período de avaliação"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-surface-muted my-2 h-1.5 overflow-hidden rounded-full"
      >
        <div
          className={`h-full rounded-full ${trial.near_expiry ? 'bg-warning' : 'bg-brand-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <PlansLink />
    </Alert>
  );
}

// Situação da avaliação no Início e em Plano. Empresa com plano contratado não vê nada aqui.
export function TrialBanner({ situation }: { situation: PlanSituation }) {
  const { trial, state } = situation;

  if (state === 'trial_active') return <ActiveTrial situation={situation} />;

  if (state === 'trial_expired') {
    return (
      <Alert tone="warning" title="Período de avaliação encerrado">
        <p>
          {trial?.ends_at ? `A avaliação terminou em ${formatDate(trial.ends_at)}. ` : ''}
          Você continua com acesso de consulta e todos os dados estão preservados. Criar e alterar
          registros fica indisponível até a contratação; ao contratar, nada se perde.
        </p>
        <div className="mt-2">
          <PlansLink />
        </div>
      </Alert>
    );
  }

  if (state === 'trial_not_started') {
    return (
      <Alert tone="info" title="Comece sua avaliação gratuita">
        <p>
          {trial?.total_days
            ? `São ${trial.total_days} dias para experimentar o CRM. A contagem começa quando a avaliação for iniciada.`
            : 'A contagem começa quando a avaliação for iniciada.'}
        </p>
        <StartTrialAction totalDays={trial?.total_days ?? null} />
      </Alert>
    );
  }

  return null;
}
