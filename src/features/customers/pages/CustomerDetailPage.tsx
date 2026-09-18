import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { ContactsSection } from '../components/ContactsSection';
import { useDeleteCustomer } from '../hooks/useCustomerMutations';
import { useCustomerQuery } from '../hooks/useCustomers';

// Detalhe do cliente (secao 14): dados principais + contatos. Timeline/oportunidades/
// tarefas/notas ficam para incrementos futuros — fora do escopo da 3.3.
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: customer, isPending, isError, error, refetch } = useCustomerQuery(id);
  const deleteMutation = useDeleteCustomer();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!id) return <Navigate to="/customers" replace />;

  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/customers" replace />;
  }

  async function handleDelete() {
    if (!id) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/customers', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Nao foi possivel excluir o cliente.');
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">{customer.name}</h1>
              <p className="text-sm text-neutral-500">
                {[customer.document, customer.primary_phone, customer.primary_email]
                  .filter(Boolean)
                  .join(' · ') || 'Sem dados de contato'}
              </p>
            </div>
            <div className="flex gap-2">
              {hasPermission('customers:update') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/customers/${customer.id}/edit`)}
                >
                  Editar
                </Button>
              )}
              {hasPermission('customers:delete') && !confirmingDelete && (
                <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
                  Excluir
                </Button>
              )}
            </div>
          </header>

          {deleteError && (
            <Alert tone="danger" title="Nao foi possivel excluir">
              {deleteError}
            </Alert>
          )}

          {confirmingDelete && (
            <Alert tone="warning" title="Excluir este cliente?">
              <p className="mb-2">
                O cliente deixara de aparecer nas listagens. Esta acao pode ser revertida apenas por
                quem tem acesso ao banco de dados.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleteMutation.isPending}
                  onClick={() => void handleDelete()}
                >
                  Confirmar exclusao
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            </Alert>
          )}

          <Card>
            <ContactsSection customerId={customer.id} />
          </Card>
        </>
      )}
    </div>
  );
}
