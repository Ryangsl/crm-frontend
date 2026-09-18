import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/services/api';
import { CustomerForm } from '../components/CustomerForm';
import { useCustomerQuery } from '../hooks/useCustomers';

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isPending, isError, error, refetch } = useCustomerQuery(id);

  if (!id) return <Navigate to="/customers" replace />;

  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/customers" replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Editar cliente</h1>
      </header>

      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando cliente...
        </p>
      )}

      {isError && (
        <Alert tone="danger" title="Nao foi possivel carregar o cliente">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {customer && (
        <Card className="max-w-lg">
          <CustomerForm
            customer={customer}
            onSuccess={(updated) => navigate(`/customers/${updated.id}`, { replace: true })}
            onCancel={() => navigate(`/customers/${customer.id}`)}
          />
        </Card>
      )}
    </div>
  );
}
