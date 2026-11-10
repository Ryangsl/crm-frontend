import type { Pipeline, Stage } from '@/features/opportunities/types/opportunity';

export type StageKind = 'work' | 'won' | 'lost';

export function stageKind(stage: Pick<Stage, 'is_won' | 'is_lost'>): StageKind {
  if (stage.is_won) return 'won';
  if (stage.is_lost) return 'lost';
  return 'work';
}

export function kindFlags(kind: StageKind): { is_won: boolean; is_lost: boolean } {
  return { is_won: kind === 'won', is_lost: kind === 'lost' };
}

// Mesma ordem do backend e do quadro (KanbanBoard): `order`, depois `id`.
export function sortStages(stages: Stage[]): Stage[] {
  return [...stages].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

// D-032: pular etapa e haver ao menos uma etapa ativa entre origem e destino. Espelha
// `PipelinesService.countStagesBetween` no backend (que decide): conta etapas, nao a diferenca de
// `order`, que pode ter lacunas.
export function countStagesBetween(stages: Stage[], from: Stage, to: Stage): number {
  const low = Math.min(from.order, to.order);
  const high = Math.max(from.order, to.order);
  return stages.filter((stage) => stage.order > low && stage.order < high).length;
}

export interface StageOrderUpdate {
  stageId: string;
  order: number;
}

// Subir/descer uma etapa troca a posicao com a vizinha (duas alteracoes). Se as duas tiverem o
// mesmo `order` (possivel pela API), afasta a que se move em uma unidade.
export function reorderUpdates(
  stages: Stage[],
  stageId: string,
  direction: 'up' | 'down',
): StageOrderUpdate[] {
  const ordered = sortStages(stages);
  const index = ordered.findIndex((stage) => stage.id === stageId);
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || neighborIndex < 0 || neighborIndex >= ordered.length) return [];
  const moving = ordered[index];
  const neighbor = ordered[neighborIndex];
  if (moving.order !== neighbor.order) {
    return [
      { stageId: moving.id, order: neighbor.order },
      { stageId: neighbor.id, order: moving.order },
    ];
  }
  if (direction === 'down') return [{ stageId: moving.id, order: moving.order + 1 }];
  return moving.order > 0
    ? [{ stageId: moving.id, order: moving.order - 1 }]
    : [{ stageId: neighbor.id, order: neighbor.order + 1 }];
}

export interface PipelineWarning {
  key: 'no-work' | 'no-won' | 'no-lost';
  text: string;
}

// O que impede o pipeline de ser usado de ponta a ponta. Uma oportunidade nasce numa etapa de
// trabalho (nao terminal); ganhar e perder usam as etapas marcadas (BR-11, BR-12).
export function pipelineWarnings(pipeline: Pipeline): PipelineWarning[] {
  const warnings: PipelineWarning[] = [];
  if (!pipeline.stages.some((stage) => !stage.is_won && !stage.is_lost)) {
    warnings.push({
      key: 'no-work',
      text: 'Sem etapa de trabalho: não é possível criar oportunidades neste pipeline.',
    });
  }
  if (!pipeline.stages.some((stage) => stage.is_won)) {
    warnings.push({
      key: 'no-won',
      text: 'Sem etapa de ganho: oportunidades deste pipeline não podem ser marcadas como ganhas.',
    });
  }
  if (!pipeline.stages.some((stage) => stage.is_lost)) {
    warnings.push({
      key: 'no-lost',
      text: 'Sem etapa de perda: oportunidades deste pipeline não podem ser marcadas como perdidas.',
    });
  }
  return warnings;
}
