import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';
import { useStartTrial } from '../hooks/usePlan';

// Iniciar é decisão explícita e única: a contagem começa neste clique, nunca na criação da empresa.
export function StartTrialAction({ totalDays }: { totalDays: number | null }) {
  const { hasPermission } = useAuth();
  const start = useStartTrial();

  if (!hasPermission('plan:manage')) {
    return (
      <p className="mt-1">
        Consulte os dados à vontade. Para começar a usar, peça a um administrador para iniciar a
        avaliação.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <Button size="sm" loading={start.isPending} onClick={() => start.mutate()}>
        {totalDays ? `Iniciar avaliação de ${totalDays} dias` : 'Iniciar avaliação'}
      </Button>
      {start.isError && (
        <p role="alert" className="text-danger mt-1 text-xs">
          Não foi possível iniciar a avaliação. Tente novamente.
        </p>
      )}
    </div>
  );
}
