import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { OpportunityActionPanel } from '../components/OpportunityActionPanel';
import type { ActionMode } from '../components/OpportunityActionPanel';
import { OpportunityStatusBadge } from '../components/OpportunityStatusBadge';
import { useDeleteOpportunity } from '../hooks/useOpportunityMutations';
import { useOpportunityQuery, usePipelineQuery } from '../hooks/useOpportunities';
import { formatMoney } from '../lib/money';

// Acoes seguem status E permissao — o backend revalida tudo (409 se a oportunidade ja foi
// encerrada). Ganha/perdida e terminal (BR-11): nenhuma acao de pipeline aparece.
export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { data: opportunity, isPending, isError, error, refetch } = useOpportunityQuery(id);
  const { data: pipeline } = usePipelineQuery(opportunity?.pipeline_id);
  const deleteMutation = useDeleteOpportunity();

  const [mode, setMode] = useState<ActionMode | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!id) return <Navigate to="/opportunities" replace />;
  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/opportunities" replace />;
  }
  const opportunityId = id;

  const stage = pipeline?.stages.find((item) => item.id === opportunity?.stage_id);
  const canUpdate = hasPermission('opportunities:update');
  const isOpen = opportunity?.status === 'open';

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(opportunityId);
      navigate('/opportunities', { replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : 'Não foi possível excluir a oportunidade.',
      );
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-neutral-900">
                  {opportunity.customer.name}
                </h1>
                <OpportunityStatusBadge status={opportunity.status} />
              </div>
              <p className="text-sm text-neutral-500">
                Etapa: {stage?.name ?? '—'} · Valor: {formatMoney(opportunity.value)}
              </p>
              <p className="text-sm text-neutral-500">Responsável: {opportunity.owner.name}</p>
              {opportunity.status === 'lost' && opportunity.lost_reason && (
                <p className="text-sm text-neutral-500">
                  Motivo da perda: {opportunity.lost_reason}
                </p>
              )}
              <Link
                to={`/customers/${opportunity.customer_id}`}
                className="text-sm text-brand-700 hover:underline"
              >
                Ver cliente
              </Link>
            </div>
            {canUpdate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/opportunities/${opportunity.id}/edit`)}
              >
                Editar
              </Button>
            )}
          </header>

          {deleteError && (
            <Alert tone="danger" title="Não foi possível excluir">
              {deleteError}
            </Alert>
          )}

          <Card title="Ações">
            {!isOpen && (
              <p className="text-sm text-neutral-500">
                Oportunidade encerrada — não pode voltar ao pipeline.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {canUpdate && isOpen && mode === null && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setMode('move')}>
                    Mover
                  </Button>
                  <Button size="sm" onClick={() => setMode('win')}>
                    Ganhar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setMode('lose')}>
                    Perder
                  </Button>
                </>
              )}
              {hasPermission('opportunities:delete') && !confirmingDelete && (
                <Button size="sm" variant="danger" onClick={() => setConfirmingDelete(true)}>
                  Excluir
                </Button>
              )}
            </div>

            {mode !== null && pipeline && (
              <div className="mt-4">
                <OpportunityActionPanel
                  opportunity={opportunity}
                  stages={pipeline.stages}
                  mode={mode}
                  onDone={() => setMode(null)}
                  onCancel={() => setMode(null)}
                />
              </div>
            )}

            {confirmingDelete && (
              <div className="mt-4">
                <Alert tone="warning" title="Excluir esta oportunidade?">
                  <p className="mb-2">
                    A oportunidade deixará de aparecer nas listagens e no pipeline. O histórico de
                    etapas é preservado.
                  </p>
                  <div className="flex gap-2">
                    <Button
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
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Alert>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
