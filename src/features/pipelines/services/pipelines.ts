import { apiDelete, apiPatch, apiPost } from '@/services/api';
import type { Pipeline, Stage } from '@/features/opportunities/types/opportunity';

// Configuracao de pipelines e etapas (RF-09). Leitura continua em
// features/opportunities/services/opportunities.ts (listPipelines/getPipeline).

export interface PipelineInput {
  name?: string;
  is_default?: boolean;
}

export interface StageInput {
  name?: string;
  order?: number;
  is_won?: boolean;
  is_lost?: boolean;
  requires_value?: boolean;
}

export function createPipeline(input: { name: string; is_default?: boolean }): Promise<Pipeline> {
  return apiPost<Pipeline>('/v1/pipelines', input);
}

export function updatePipeline(id: string, input: PipelineInput): Promise<Pipeline> {
  return apiPatch<Pipeline>(`/v1/pipelines/${id}`, input);
}

export function deletePipeline(id: string): Promise<void> {
  return apiDelete<void>(`/v1/pipelines/${id}`);
}

export function createStage(
  pipelineId: string,
  input: StageInput & { name: string },
): Promise<Stage> {
  return apiPost<Stage>(`/v1/pipelines/${pipelineId}/stages`, input);
}

export function updateStage(
  pipelineId: string,
  stageId: string,
  input: StageInput,
): Promise<Stage> {
  return apiPatch<Stage>(`/v1/pipelines/${pipelineId}/stages/${stageId}`, input);
}

export function deleteStage(pipelineId: string, stageId: string): Promise<void> {
  return apiDelete<void>(`/v1/pipelines/${pipelineId}/stages/${stageId}`);
}
