import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { formatMoney } from '../lib/money';
import type { Opportunity, Stage } from '../types/opportunity';
import { OpportunityActionPanel } from './OpportunityActionPanel';
import type { ActionMode } from './OpportunityActionPanel';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';

interface OpportunityCardProps {
  opportunity: Opportunity;
  stages: Stage[];
  canUpdate: boolean;
}

// Card do Kanban: so dados que existem (cliente, valor, responsavel, status) — a oportunidade
// nao tem titulo proprio. Sem drag-and-drop: mover/ganhar/perder por botoes (acessivel e
// testavel), com o mesmo painel usado no detalhe.
export function OpportunityCard({ opportunity, stages, canUpdate }: OpportunityCardProps) {
  const [mode, setMode] = useState<ActionMode | null>(null);
  const isOpen = opportunity.status === 'open';

  return (
    <article className="bg-surface border-border-subtle flex flex-col gap-2 rounded-lg border p-3 shadow-sm">
      <Link
        to={`/opportunities/${opportunity.id}`}
        className="font-medium text-neutral-900 hover:underline"
      >
        {opportunity.customer.name}
      </Link>
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        <span>{formatMoney(opportunity.value)}</span>
        {!isOpen && <OpportunityStatusBadge status={opportunity.status} />}
      </div>
      <p className="text-xs text-neutral-500">Responsável: {opportunity.owner.name}</p>

      {canUpdate && isOpen && mode === null && (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" onClick={() => setMode('move')}>
            Mover
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('win')}>
            Ganhar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('lose')}>
            Perder
          </Button>
        </div>
      )}

      {mode !== null && (
        <OpportunityActionPanel
          opportunity={opportunity}
          stages={stages}
          mode={mode}
          onDone={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}
    </article>
  );
}
