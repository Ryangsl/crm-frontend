import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { ClosingReasonFields } from '@/features/closing-reasons/components/ClosingReasonFields';
import {
  choiceErrorMessage,
  EMPTY_CHOICE,
  isChoiceComplete,
  toChoice,
} from '@/features/closing-reasons/choice';
import type { ChoiceDraft } from '@/features/closing-reasons/choice';
import { useClosingReasonsQuery } from '@/features/closing-reasons/hooks';
import {
  Building2,
  CalendarDays,
  CircleSlash,
  IdCard,
  Mail,
  Phone,
  Signpost,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  RecordHeader,
  RecordLayout,
  StageSteps,
  SummaryCard,
  SummaryItem,
} from '@/components/record/Record';
import type { Step } from '@/components/record/Record';
import { useUserNames } from '@/features/users/hooks/useUsers';
import { Alert } from '@/components/ui/Alert';
import { OutsideBusinessHoursAlert } from '@/features/access-control/components/OutsideBusinessHoursAlert';
import { isOutsideBusinessHours } from '@/features/access-control/lib/labels';
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
import { LeadConvertForm } from '../components/LeadConvertForm';
import { LeadStatusBadge } from '../components/LeadStatusBadge';
import {
  useDeleteLead,
  useDisqualifyLead,
  useQualifyLead,
  useReopenLead,
} from '../hooks/useLeadMutations';
import { useLeadQuery, useLeadSourcesQuery } from '../hooks/useLeads';
import type { LeadStatus } from '../types/lead';

const QUALIFIABLE: LeadStatus[] = ['new', 'in_progress'];
const DISQUALIFIABLE: LeadStatus[] = ['new', 'in_progress', 'qualified'];
const REOPENABLE: LeadStatus[] = ['disqualified'];
const CONVERTIBLE: LeadStatus[] = ['new', 'in_progress', 'qualified'];

// Acoes respeitam o status atual (secao 19): backend revalida tudo de novo (nunca confia so
// no frontend) — aqui e so UX, escondendo acoes que o backend rejeitaria com 409.
const FUNNEL: { status: LeadStatus; label: string }[] = [
  { status: 'new', label: 'Novo' },
  { status: 'in_progress', label: 'Em andamento' },
  { status: 'qualified', label: 'Qualificado' },
  { status: 'converted', label: 'Convertido' },
];

// Funil do lead. Desqualificado sai do funil: mostra de onde saiu so como "Novo -> Desqualificado".
function leadSteps(status: LeadStatus): Step[] {
  if (status === 'disqualified') {
    return [
      { id: 'new', label: 'Novo', state: 'done' },
      { id: 'disqualified', label: 'Desqualificado', state: 'current' },
    ];
  }
  const current = FUNNEL.findIndex((step) => step.status === status);
  return FUNNEL.map((step, index) => ({
    id: step.status,
    label: step.label,
    state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
  }));
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const userNames = useUserNames();
  const { data: lead, isPending, isError, error, refetch } = useLeadQuery(id);
  const { data: sources } = useLeadSourcesQuery();

  const [panel, setPanel] = useState<'none' | 'disqualify' | 'convert' | 'delete'>('none');
  const [choice, setChoice] = useState<ChoiceDraft>(EMPTY_CHOICE);
  const disqualifyReasons = useClosingReasonsQuery('lead_disqualified', panel === 'disqualify');
  const [actionError, setActionError] = useState<string | null>(null);

  const qualifyMutation = useQualifyLead(id ?? '');
  const disqualifyMutation = useDisqualifyLead(id ?? '');
  const reopenMutation = useReopenLead(id ?? '');
  const deleteMutation = useDeleteLead();

  if (!id) return <Navigate to="/leads" replace />;
  if (isError && error instanceof ApiError && error.status === 404) {
    return <Navigate to="/leads" replace />;
  }
  const leadId = id; // narrowed para string — closures abaixo nao herdam o guard acima.

  const sourceName = sources?.data.find((source) => source.id === lead?.source_id)?.name;
  const canUpdate = hasPermission('leads:update');

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      setPanel('none');
    } catch (err) {
      setActionError(
        choiceErrorMessage(err) ??
          (err instanceof ApiError ? err.message : 'Não foi possível completar a ação.'),
      );
    }
  }

  async function handleDisqualify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isChoiceComplete(disqualifyReasons.data?.data, choice)) return;
    await runAction(() => disqualifyMutation.mutateAsync(toChoice(choice)));
    setChoice(EMPTY_CHOICE);
  }

  async function handleDelete() {
    await runAction(() => deleteMutation.mutateAsync(leadId));
    navigate('/leads', { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando lead...
        </p>
      )}

      {isError && isOutsideBusinessHours(error) && <OutsideBusinessHoursAlert />}

      {isError && !isOutsideBusinessHours(error) && (
        <Alert tone="danger" title="Não foi possível carregar o lead">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      )}

      {lead && (
        <>
          <RecordHeader
            breadcrumb={[{ label: 'Leads', to: '/leads' }, { label: lead.name || 'Lead' }]}
            title={lead.name || 'Lead'}
            badge={<LeadStatusBadge status={lead.status} />}
            actions={
              <>
                {canUpdate && QUALIFIABLE.includes(lead.status) && (
                  <Button
                    writes
                    size="sm"
                    loading={qualifyMutation.isPending}
                    onClick={() => void runAction(() => qualifyMutation.mutateAsync())}
                  >
                    Qualificar
                  </Button>
                )}
                {canUpdate && CONVERTIBLE.includes(lead.status) && panel !== 'convert' && (
                  <Button writes size="sm" variant="secondary" onClick={() => setPanel('convert')}>
                    Converter
                  </Button>
                )}
                {canUpdate && DISQUALIFIABLE.includes(lead.status) && panel !== 'disqualify' && (
                  <Button
                    writes
                    size="sm"
                    variant="secondary"
                    onClick={() => setPanel('disqualify')}
                  >
                    Desqualificar
                  </Button>
                )}
                {canUpdate && REOPENABLE.includes(lead.status) && (
                  <Button
                    writes
                    size="sm"
                    loading={reopenMutation.isPending}
                    onClick={() => void runAction(() => reopenMutation.mutateAsync())}
                  >
                    Reabrir
                  </Button>
                )}
                {hasPermission('opportunities:create') &&
                  lead.status === 'converted' &&
                  lead.customer_id && (
                    <Button
                      writes
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/opportunities/new?lead_id=${lead.id}&customer_id=${lead.customer_id}`,
                        )
                      }
                    >
                      Criar oportunidade
                    </Button>
                  )}
                {canUpdate && (
                  <Button
                    writes
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/leads/${lead.id}/edit`)}
                  >
                    Editar
                  </Button>
                )}
              </>
            }
          />

          <StageSteps
            label="Situação"
            steps={leadSteps(lead.status)}
            tone={
              lead.status === 'disqualified'
                ? 'danger'
                : lead.status === 'converted'
                  ? 'success'
                  : 'brand'
            }
          />

          {actionError && (
            <Alert tone="danger" title="Não foi possível completar a ação">
              {actionError}
            </Alert>
          )}

          <RecordLayout
            main={
              <>
                {panel === 'disqualify' && (
                  <Card title="Desqualificar lead">
                    <form
                      onSubmit={(event) => void handleDisqualify(event)}
                      className="flex flex-col gap-3"
                    >
                      <ClosingReasonFields
                        kind="lead_disqualified"
                        label="Motivo da desqualificação"
                        value={choice}
                        onChange={setChoice}
                      />
                      <div className="flex gap-2">
                        <Button
                          writes
                          type="submit"
                          size="sm"
                          loading={disqualifyMutation.isPending}
                          disabled={
                            disqualifyMutation.isPending ||
                            !isChoiceComplete(disqualifyReasons.data?.data, choice)
                          }
                        >
                          Confirmar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setPanel('none')}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {panel === 'convert' && (
                  <Card title="Converter em cliente">
                    <LeadConvertForm
                      lead={lead}
                      onSuccess={() => setPanel('none')}
                      onCancel={() => setPanel('none')}
                    />
                  </Card>
                )}

                {panel === 'delete' && (
                  <Alert tone="warning" title="Excluir este lead?">
                    <p className="mb-2">
                      O lead deixará de aparecer nas listagens. Esta ação só pode ser revertida por
                      quem tem acesso ao banco de dados.
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
                      <Button size="sm" variant="secondary" onClick={() => setPanel('none')}>
                        Cancelar
                      </Button>
                    </div>
                  </Alert>
                )}

                <Card>
                  <TimelineSection entityType="lead" entityId={leadId} />
                </Card>
                <Card>
                  <EntityConversationsSection entityType="lead" entityId={leadId} />
                </Card>
                <Card>
                  <TasksSection entityType="lead" entityId={leadId} />
                </Card>
                <Card>
                  <AppointmentsSection entityType="lead" entityId={leadId} />
                </Card>
                <Card>
                  <NotesSection entityType="lead" entityId={leadId} />
                </Card>
              </>
            }
            aside={
              // D-094: dados de contato do lead (os mesmos que viram o Cliente na conversão).
              <SummaryCard
                title="Dados do lead"
                footer={
                  hasPermission('leads:delete') && panel !== 'delete' ? (
                    <Button writes size="sm" variant="ghost" onClick={() => setPanel('delete')}>
                      <Trash2 aria-hidden="true" className="size-4" />
                      Excluir
                    </Button>
                  ) : undefined
                }
              >
                <SummaryItem icon={Phone} label="Telefone">
                  {lead.phone || '—'}
                </SummaryItem>
                <SummaryItem icon={Mail} label="E-mail">
                  {lead.email || '—'}
                </SummaryItem>
                <SummaryItem icon={IdCard} label="CPF ou CNPJ">
                  {lead.document || '—'}
                </SummaryItem>
                <SummaryItem icon={Signpost} label="Origem">
                  {sourceName ?? '—'}
                </SummaryItem>
                <SummaryItem icon={UserRound} label="Responsável">
                  {lead.owner_id
                    ? (userNames.get(lead.owner_id) ?? 'Atribuído')
                    : 'Sem responsável'}
                </SummaryItem>
                <SummaryItem icon={CalendarDays} label="Criado em">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </SummaryItem>
                {lead.status === 'disqualified' && lead.disqualify_reason && (
                  <SummaryItem icon={CircleSlash} label="Motivo da desqualificação">
                    {lead.disqualify_reason}
                    {lead.disqualify_note ? ` — ${lead.disqualify_note}` : ''}
                  </SummaryItem>
                )}
                {lead.customer_id && (
                  <SummaryItem icon={Building2} label="Cliente">
                    <Link
                      to={`/customers/${lead.customer_id}`}
                      className="text-brand-700 hover:underline"
                    >
                      Ver cliente
                    </Link>
                  </SummaryItem>
                )}
              </SummaryCard>
            }
          />
        </>
      )}
    </div>
  );
}
