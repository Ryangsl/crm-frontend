import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  updatePipeline,
  updateStage,
} from '../services/pipelines';
import type { PipelineInput, StageInput } from '../services/pipelines';

// Toda alteracao recarrega os pipelines (configuracao, quadro e formularios de oportunidade) e as
// oportunidades, que mostram o nome da etapa.
function useInvalidatePipelines() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
  };
}

export function useCreatePipeline() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: (input: { name: string; is_default?: boolean }) => createPipeline(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePipeline() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PipelineInput }) => updatePipeline(id, input),
    onSuccess: invalidate,
  });
}

export function useDeletePipeline() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: invalidate,
  });
}

export function useCreateStage() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: ({
      pipelineId,
      input,
    }: {
      pipelineId: string;
      input: StageInput & { name: string };
    }) => createStage(pipelineId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateStage() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      input,
    }: {
      pipelineId: string;
      stageId: string;
      input: StageInput;
    }) => updateStage(pipelineId, stageId, input),
    onSuccess: invalidate,
  });
}

// Subir/descer: as alteracoes vao em sequencia; recarrega no fim mesmo se uma falhar, para a tela
// mostrar o que o backend gravou.
export function useReorderStages() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      updates,
    }: {
      pipelineId: string;
      updates: { stageId: string; order: number }[];
    }) => {
      for (const update of updates) {
        await updateStage(pipelineId, update.stageId, { order: update.order });
      }
    },
    onSettled: invalidate,
  });
}

export function useDeleteStage() {
  const invalidate = useInvalidatePipelines();
  return useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      deleteStage(pipelineId, stageId),
    onSuccess: invalidate,
  });
}
