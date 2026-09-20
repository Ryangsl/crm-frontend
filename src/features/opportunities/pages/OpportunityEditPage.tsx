import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/services/api';
import { OpportunityForm } from '../components/OpportunityForm';
import { useOpportunityQuery } from '../hooks/useOpportunities';

export function OpportunityEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opportunity, isPending, isError, error, refetch } = useOpportunityQuery(id);

  if (!id) return <Navigate to="/opportunities" replace />;
  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/opportunities" replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Editar oportunidade</h1>
      </header>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando oportunidade...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Não foi possível carregar a oportunidade">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {opportunity && (
        <Card className="max-w-lg">
          <OpportunityForm
            opportunity={opportunity}
            onSuccess={(updated) => navigate(`/opportunities/${updated.id}`, { replace: true })}
            onCancel={() => navigate(`/opportunities/${opportunity.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
