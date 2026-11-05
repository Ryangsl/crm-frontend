import { Link, useLocation } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { usePlanQuery } from '../hooks/usePlan';
import { StartTrialAction } from './StartTrialAction';

// Identifica o modo de consulta em toda tela. No Início e em Plano quem explica é o TrialBanner. O aviso
// dos últimos dias de avaliação fica só no Início: não acompanha o usuário em todo acesso.
export function TrialShellNotice() {
  const { pathname } = useLocation();
  const { data } = usePlanQuery();
  if (!data || pathname === '/' || pathname === '/plan') return null;

  if (data.state === 'trial_expired') {
    return (
      <div className="mb-4" data-testid="trial-shell-notice">
        <Alert tone="warning" title="Modo de consulta: período de avaliação encerrado">
          Seus dados estão preservados e você pode consultá-los. Criar e alterar registros fica
          indisponível até a contratação.{' '}
          <Link to="/plan" className="text-brand-700 font-medium underline">
            Conhecer os planos
          </Link>
        </Alert>
      </div>
    );
  }

  if (data.state === 'trial_not_started') {
    return (
      <div className="mb-4" data-testid="trial-shell-notice">
        <Alert tone="info" title="Período de avaliação não iniciado">
          <StartTrialAction totalDays={data.trial?.total_days ?? null} />
        </Alert>
      </div>
    );
  }

  return null;
}
