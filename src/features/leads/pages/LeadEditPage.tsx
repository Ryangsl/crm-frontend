import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/services/api';
import { LeadForm } from '../components/LeadForm';
import { useLeadQuery } from '../hooks/useLeads';

export function LeadEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isPending, isError, error, refetch } = useLeadQuery(id);

  if (!id) return <Navigate to="/leads" replace />;
  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/leads" replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Editar lead</h1>
      </header>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando lead...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar o lead">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {lead && (
        <Card className="max-w-lg">
          <LeadForm
            lead={lead}
            onSuccess={(updated) => navigate(`/leads/${updated.id}`, { replace: true })}
            onCancel={() => navigate(`/leads/${lead.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
