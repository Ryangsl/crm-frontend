import { useMemo } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import type { Opportunity, Pipeline } from '../types/opportunity';
import { OpportunityCard } from './OpportunityCard';

interface KanbanBoardProps {
  pipeline: Pipeline;
  opportunities: Opportunity[];
}

// Uma coluna por etapa (ordenadas por order), um card por oportunidade. Em telas pequenas o
// quadro rola na horizontal (nao comprime as colunas); snap por coluna facilita o toque.
export function KanbanBoard({ pipeline, opportunities }: KanbanBoardProps) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('opportunities:update');

  const stages = useMemo(
    () => [...pipeline.stages].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [pipeline.stages],
  );

  if (stages.length === 0) {
    return (
      <EmptyState
        title="Este pipeline ainda não tem etapas"
        description="Cadastre as etapas do pipeline para acompanhar as oportunidades."
      />
    );
  }

  return (
    <div
      className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0"
      data-testid="kanban-board"
    >
      {stages.map((stage) => {
        const cards = opportunities.filter((opportunity) => opportunity.stage_id === stage.id);
        return (
          <section
            key={stage.id}
            aria-label={`Etapa ${stage.name}`}
            className="bg-surface-muted border-border-subtle flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border p-2"
          >
            <header className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-neutral-900">{stage.name}</h2>
              <span className="text-xs text-neutral-500">{cards.length}</span>
            </header>
            <div className="flex flex-wrap gap-1 px-1 text-xs text-neutral-500">
              {stage.requires_value && <span>Exige valor</span>}
              {stage.is_won && <span>Etapa de ganho</span>}
              {stage.is_lost && <span>Etapa de perda</span>}
            </div>

            {cards.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-neutral-400">Nenhuma oportunidade</p>
            ) : (
              cards.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  stages={stages}
                  canUpdate={canUpdate}
                />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
