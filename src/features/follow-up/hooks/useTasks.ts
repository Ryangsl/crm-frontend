import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTask, deleteTask, listTasks, updateTask } from '../services/followUp';
import type { CrmEntityType, TaskCreateInput, TaskUpdateInput } from '../types/followUp';

function queryKey(entityType: CrmEntityType, entityId: string) {
  return ['follow-up', 'tasks', entityType, entityId];
}

// Uma tarefa aparece no registro de origem e na visao transversal (Follow-ups, chave ['tasks']):
// toda escrita atualiza as duas.
function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['follow-up', 'tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };
}

export function useTasksQuery(entityType: CrmEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKey(entityType, entityId as string),
    queryFn: () => listTasks(entityType, entityId as string),
    enabled: Boolean(entityId),
    select: (response) => response.data,
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => createTask(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskUpdateInput }) =>
      updateTask(taskId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: invalidate,
  });
}
