import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
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
export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: lead, isPending, isError, error, refetch } = useLeadQuery(id);
  const { data: sources } = useLeadSourcesQuery();

  const [panel, setPanel] = useState<'none' | 'disqualify' | 'convert' | 'delete'>('none');
  const [reason, setReason] = useState('');
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
      setActionError(err instanceof ApiError ? err.message : 'Nao foi possivel completar a acao.');
    }
  }

  async function handleDisqualify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;
    await runAction(() => disqualifyMutation.mutateAsync(reason.trim()));
    setReason('');
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
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-neutral-900">Lead</h1>
                <LeadStatusBadge status={lead.status} />
              </div>
              <p className="text-sm text-neutral-500">Origem: {sourceName ?? '—'}</p>
              <p className="text-sm text-neutral-500">
                Responsável: {lead.owner_id ? 'Atribuído' : 'Sem responsável'}
              </p>
              {lead.status === 'disqualified' && lead.disqualify_reason && (
                <p className="text-sm text-neutral-500">Motivo: {lead.disqualify_reason}</p>
              )}
            </div>
            {canUpdate && (
              <Button variant="secondary" size="sm" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                Editar
              </Button>
            )}
          </header>

          {actionError && (
            <Alert tone="danger" title="Nao foi possivel completar a acao">
              {actionError}
            </Alert>
          )}

          <Card title="Ações">
            <div className="flex flex-wrap gap-2">
              {canUpdate && QUALIFIABLE.includes(lead.status) && (
                <Button
                  size="sm"
                  loading={qualifyMutation.isPending}
                  onClick={() => void runAction(() => qualifyMutation.mutateAsync())}
                >
                  Qualificar
                </Button>
              )}
              {canUpdate && DISQUALIFIABLE.includes(lead.status) && panel !== 'disqualify' && (
                <Button size="sm" variant="secondary" onClick={() => setPanel('disqualify')}>
                  Desqualificar
                </Button>
              )}
              {canUpdate && REOPENABLE.includes(lead.status) && (
                <Button
                  size="sm"
                  loading={reopenMutation.isPending}
                  onClick={() => void runAction(() => reopenMutation.mutateAsync())}
                >
                  Reabrir
                </Button>
              )}
              {canUpdate && CONVERTIBLE.includes(lead.status) && panel !== 'convert' && (
                <Button size="sm" variant="secondary" onClick={() => setPanel('convert')}>
                  Converter
                </Button>
              )}
              {hasPermission('leads:delete') && panel !== 'delete' && (
                <Button size="sm" variant="danger" onClick={() => setPanel('delete')}>
                  Excluir
                </Button>
              )}
            </div>

            {panel === 'disqualify' && (
              <form onSubmit={(event) => void handleDisqualify(event)} className="mt-4 flex flex-col gap-3">
                <Input
                  label="Motivo da desqualificação"
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={disqualifyMutation.isPending}>
                    Confirmar
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setPanel('none')}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {panel === 'convert' && (
              <div className="mt-4">
                <LeadConvertForm
                  leadId={lead.id}
                  onSuccess={() => setPanel('none')}
                  onCancel={() => setPanel('none')}
                />
              </div>
            )}

            {panel === 'delete' && (
              <Alert tone="warning" title="Excluir este lead?" >
                <p className="mb-2">
                  O lead deixará de aparecer nas listagens. Esta ação só pode ser revertida por
                  quem tem acesso ao banco de dados.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" loading={deleteMutation.isPending} onClick={() => void handleDelete()}>
                    Confirmar exclusão
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPanel('none')}>
                    Cancelar
                  </Button>
                </div>
              </Alert>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
