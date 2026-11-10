import { describe, expect, it } from 'vitest';

import type { Pipeline, Stage } from '@/features/opportunities/types/opportunity';
import { countStagesBetween, pipelineWarnings, reorderUpdates, sortStages } from './stages';

function stage(id: string, order: number, extra: Partial<Stage> = {}): Stage {
  return {
    id,
    pipeline_id: 'p1',
    name: id,
    order,
    is_won: false,
    is_lost: false,
    requires_value: false,
    created_at: '',
    updated_at: '',
    ...extra,
  };
}

function pipeline(stages: Stage[]): Pipeline {
  return { id: 'p1', name: 'P', is_default: true, stages, created_at: '', updated_at: '' };
}

describe('countStagesBetween (D-032)', () => {
  it('conta etapas no meio, não a diferença de order', () => {
    const gap = [stage('a', 1), stage('c', 3), stage('d', 4)];
    expect(countStagesBetween(gap, gap[0], gap[1])).toBe(0);
    expect(countStagesBetween(gap, gap[0], gap[2])).toBe(1);
    expect(countStagesBetween(gap, gap[2], gap[0])).toBe(1);

    const spaced = [stage('a', 10), stage('b', 20), stage('c', 30)];
    expect(countStagesBetween(spaced, spaced[0], spaced[1])).toBe(0);
    expect(countStagesBetween(spaced, spaced[0], spaced[2])).toBe(1);
  });
});

describe('reorderUpdates', () => {
  const stages = [stage('b', 2), stage('a', 1), stage('c', 5)];

  it('troca a posição com a vizinha, na ordem exibida', () => {
    expect(sortStages(stages).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(reorderUpdates(stages, 'c', 'up')).toEqual([
      { stageId: 'c', order: 2 },
      { stageId: 'b', order: 5 },
    ]);
    expect(reorderUpdates(stages, 'a', 'down')).toEqual([
      { stageId: 'a', order: 2 },
      { stageId: 'b', order: 1 },
    ]);
  });

  it('nas pontas não faz nada', () => {
    expect(reorderUpdates(stages, 'a', 'up')).toEqual([]);
    expect(reorderUpdates(stages, 'c', 'down')).toEqual([]);
    expect(reorderUpdates(stages, 'x', 'up')).toEqual([]);
  });

  it('com order empatado, afasta a etapa que se move', () => {
    const tied = [stage('a', 0), stage('b', 0), stage('c', 3)];
    expect(reorderUpdates(tied, 'a', 'down')).toEqual([{ stageId: 'a', order: 1 }]);
    expect(reorderUpdates(tied, 'b', 'up')).toEqual([{ stageId: 'a', order: 1 }]);
    const tiedHigh = [stage('a', 2), stage('b', 2)];
    expect(reorderUpdates(tiedHigh, 'b', 'up')).toEqual([{ stageId: 'b', order: 1 }]);
  });
});

describe('pipelineWarnings', () => {
  it('pipeline completo não tem aviso', () => {
    const complete = pipeline([
      stage('a', 1),
      stage('w', 2, { is_won: true }),
      stage('l', 3, { is_lost: true }),
    ]);
    expect(pipelineWarnings(complete)).toEqual([]);
  });

  it('aponta o que falta', () => {
    expect(pipelineWarnings(pipeline([])).map((w) => w.key)).toEqual([
      'no-work',
      'no-won',
      'no-lost',
    ]);
    expect(pipelineWarnings(pipeline([stage('a', 1)])).map((w) => w.key)).toEqual([
      'no-won',
      'no-lost',
    ]);
  });
});
