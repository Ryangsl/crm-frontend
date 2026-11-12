import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { CalendarDays, IdCard, Mail, Phone, Trash2, UserRound } from 'lucide-react';
import { RecordHeader, RecordLayout, SummaryCard, SummaryItem } from '@/components/record/Record';
import { useUserNames } from '@/features/users/hooks/useUsers';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { AppointmentsSection } from '@/features/follow-up/components/AppointmentsSection';
import { EntityConversationsSection } from '@/features/conversations/components/EntityConversationsSection';
import { TimelineSection } from '@/features/interactions/components/TimelineSection';
import { NotesSection } from '@/features/follow-up/components/NotesSection';
import { TasksSection } from '@/features/follow-up/components/TasksSection';
import { ContactsSection } from '../components/ContactsSection';
import { useDeleteCustomer } from '../hooks/useCustomerMutations';
import { useCustomerQuery } from '../hooks/useCustomers';

// Detalhe do cliente (secao 14): dados principais + contatos + follow-up (Notes/Tasks/
// Appointments, Fase 3.6, D-031). Timeline unificada de interacoes fica para a Fase 4.
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const userNames = useUserNames();
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
      setDeleteError(err instanceof ApiError ? err.message : 'Não foi possível excluir o cliente.');
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
        <Alert tone="danger" title="Não foi possível carregar o cliente">
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
          <RecordHeader
            breadcrumb={[{ label: 'Clientes', to: '/customers' }, { label: customer.name }]}
            title={customer.name}
            actions={
              <>
                {hasPermission('opportunities:create') && (
                  <Button
                    writes
                    size="sm"
                    onClick={() => navigate(`/opportunities/new?customer_id=${customer.id}`)}
                  >
                    Nova oportunidade
                  </Button>
                )}
                {hasPermission('customers:update') && (
                  <Button
                    writes
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}/edit`)}
                  >
                    Editar
                  </Button>
                )}
              </>
            }
          />

          {deleteError && (
            <Alert tone="danger" title="Não foi possível excluir">
              {deleteError}
            </Alert>
          )}

          <RecordLayout
            main={
              <>
                {confirmingDelete && (
                  <Alert tone="warning" title="Excluir este cliente?">
                    <p className="mb-2">
                      O cliente deixará de aparecer nas listagens. Esta ação só pode ser revertida
                      por quem tem acesso ao banco de dados.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        writes
                        size="sm"
                        variant="danger"
                        loading={deleteMutation.isPending}
                        onClick={() => void handleDelete()}
                      >
                        Confirmar exclusão
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
                  <TimelineSection entityType="customer" entityId={customer.id} />
                </Card>
                <Card>
                  <EntityConversationsSection entityType="customer" entityId={customer.id} />
                </Card>
                <Card>
                  <TasksSection entityType="customer" entityId={customer.id} />
                </Card>
                <Card>
                  <AppointmentsSection entityType="customer" entityId={customer.id} />
                </Card>
                <Card>
                  <NotesSection entityType="customer" entityId={customer.id} />
                </Card>
              </>
            }
            aside={
              <>
                <SummaryCard
                  title="Dados do cliente"
                  footer={
                    hasPermission('customers:delete') && !confirmingDelete ? (
                      <Button
                        writes
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(true)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Excluir
                      </Button>
                    ) : undefined
                  }
                >
                  <SummaryItem icon={Phone} label="Telefone">
                    {customer.primary_phone || '—'}
                  </SummaryItem>
                  <SummaryItem icon={Mail} label="E-mail">
                    {customer.primary_email || '—'}
                  </SummaryItem>
                  <SummaryItem icon={IdCard} label="CPF ou CNPJ">
                    {customer.document || '—'}
                  </SummaryItem>
                  <SummaryItem icon={UserRound} label="Responsável">
                    {customer.owner_id
                      ? (userNames.get(customer.owner_id) ?? 'Atribuído')
                      : 'Sem responsável'}
                  </SummaryItem>
                  <SummaryItem icon={CalendarDays} label="Cliente desde">
                    {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                  </SummaryItem>
                </SummaryCard>
                <Card>
                  <ContactsSection customerId={customer.id} />
                </Card>
              </>
            }
          />
        </>
      )}
    </div>
  );
}
