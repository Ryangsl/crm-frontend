import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import {
  Building2,
  CalendarDays,
  CircleSlash,
  Columns3,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  RecordHeader,
  RecordLayout,
  StageSteps,
  SummaryCard,
  SummaryItem,
} from '@/components/record/Record';
import type { Step } from '@/components/record/Record';
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
import { OpportunityActionPanel } from '../components/OpportunityActionPanel';
import type { ActionMode } from '../components/OpportunityActionPanel';
import { OpportunityStatusBadge } from '../components/OpportunityStatusBadge';
import { StageHistorySection } from '../components/StageHistorySection';
import { useDeleteOpportunity } from '../hooks/useOpportunityMutations';
import { useOpportunityQuery, usePipelineQuery } from '../hooks/useOpportunities';
import { formatMoney } from '../lib/money';
import type { OpportunityStatus, Stage } from '../types/opportunity';

const MODE_TITLE: Record<ActionMode, string> = {
  move: 'Mover de etapa',
  win: 'Marcar como ganha',
  lose: 'Marcar como perdida',
};

// Etapas de trabalho do pipeline e a etapa final que vale para esta oportunidade: a de ganho
// enquanto aberta ou ganha, a de perda quando perdida.
function stageSteps(stages: Stage[], currentId: string, status: OpportunityStatus): Step[] {
  const ordered = [...stages].sort((x, y) => x.order - y.order);
  const visible = ordered.filter((stage) => (status === 'lost' ? !stage.is_won : !stage.is_lost));
  const current = visible.findIndex((stage) => stage.id === currentId);
  return visible.map((stage, index) => ({
    id: stage.id,
    label: stage.name,
    // Perdida: nao se sabe por quais etapas passou so pela etapa atual; nada fica "feito".
    state:
      index === current ? 'current' : index < current && status !== 'lost' ? 'done' : 'upcoming',
  }));
}

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
          <RecordHeader
            breadcrumb={[
              { label: 'Oportunidades', to: '/opportunities' },
              { label: opportunity.customer.name },
            ]}
            title={opportunity.customer.name}
            badge={<OpportunityStatusBadge status={opportunity.status} />}
            subtitle={isOpen ? undefined : 'Oportunidade encerrada — não pode voltar ao pipeline.'}
            actions={
              <>
                {canUpdate && isOpen && mode === null && (
                  <>
                    <Button writes size="sm" onClick={() => setMode('win')}>
                      Ganhar
                    </Button>
                    <Button writes size="sm" variant="secondary" onClick={() => setMode('move')}>
                      Mover
                    </Button>
                    <Button writes size="sm" variant="secondary" onClick={() => setMode('lose')}>
                      Perder
                    </Button>
                  </>
                )}
                {canUpdate && (
                  <Button
                    writes
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/opportunities/${opportunity.id}/edit`)}
                  >
                    Editar
                  </Button>
                )}
              </>
            }
          />

          {pipeline && (
            <StageSteps
              label="Etapa"
              steps={stageSteps(pipeline.stages, opportunity.stage_id, opportunity.status)}
              tone={
                opportunity.status === 'won'
                  ? 'success'
                  : opportunity.status === 'lost'
                    ? 'danger'
                    : 'brand'
              }
            />
          )}

          {deleteError && (
            <Alert tone="danger" title="Não foi possível excluir">
              {deleteError}
            </Alert>
          )}

          <RecordLayout
            main={
              <>
                {mode !== null && pipeline && (
                  <Card title={MODE_TITLE[mode]}>
                    <OpportunityActionPanel
                      opportunity={opportunity}
                      stages={pipeline.stages}
                      mode={mode}
                      onDone={() => setMode(null)}
                      onCancel={() => setMode(null)}
                    />
                  </Card>
                )}

                {confirmingDelete && (
                  <Alert tone="warning" title="Excluir esta oportunidade?">
                    <p className="mb-2">
                      A oportunidade deixará de aparecer nas listagens e no pipeline. O histórico de
                      etapas é preservado.
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
                        onClick={() => setConfirmingDelete(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Alert>
                )}

                <Card>
                  <TimelineSection entityType="opportunity" entityId={opportunityId} />
                </Card>
                <Card>
                  <EntityConversationsSection entityType="opportunity" entityId={opportunityId} />
                </Card>
                <Card>
                  <TasksSection entityType="opportunity" entityId={opportunityId} />
                </Card>
                <Card>
                  <AppointmentsSection entityType="opportunity" entityId={opportunityId} />
                </Card>
                <Card>
                  <NotesSection entityType="opportunity" entityId={opportunityId} />
                </Card>
              </>
            }
            aside={
              <>
                <SummaryCard
                  title="Dados da oportunidade"
                  footer={
                    hasPermission('opportunities:delete') && !confirmingDelete ? (
                      <Button
                        writes
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmingDelete(true)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Excluir
                      </Button>
                    ) : undefined
                  }
                >
                  <SummaryItem icon={Wallet} label="Valor">
                    {formatMoney(opportunity.value)}
                  </SummaryItem>
                  <SummaryItem icon={Columns3} label="Etapa">
                    {stage?.name ?? '—'}
                    {pipeline ? ` · ${pipeline.name}` : ''}
                  </SummaryItem>
                  <SummaryItem icon={Building2} label="Cliente">
                    <Link
                      to={`/customers/${opportunity.customer_id}`}
                      className="text-brand-700 hover:underline"
                    >
                      Ver cliente
                    </Link>
                  </SummaryItem>
                  <SummaryItem icon={UserRound} label="Responsável">
                    {opportunity.owner.name}
                  </SummaryItem>
                  <SummaryItem icon={CalendarDays} label="Criada em">
                    {new Date(opportunity.created_at).toLocaleDateString('pt-BR')}
                  </SummaryItem>
                  {opportunity.status === 'lost' && opportunity.lost_reason && (
                    <SummaryItem icon={CircleSlash} label="Motivo da perda">
                      {opportunity.lost_reason}
                      {opportunity.lost_note ? ` — ${opportunity.lost_note}` : ''}
                    </SummaryItem>
                  )}
                </SummaryCard>
                <Card>
                  <StageHistorySection opportunityId={opportunityId} />
                </Card>
              </>
            }
          />
        </>
      )}
    </div>
  );
}
