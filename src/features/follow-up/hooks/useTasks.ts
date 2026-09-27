import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTask, deleteTask, listTasks, updateTask } from '../services/followUp';
import type { CrmEntityType, TaskCreateInput, TaskUpdateInput } from '../types/followUp';

function queryKey(entityType: CrmEntityType, entityId: string) {
  return ['follow-up', 'tasks', entityType, entityId];
}

export function useTasksQuery(entityType: CrmEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: queryKey(entityType, entityId as string),
    queryFn: () => listTasks(entityType, entityId as string),
    enabled: Boolean(entityId),
    select: (response) => response.data,
  });
}

export function useCreateTask(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => createTask(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useUpdateTask(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskUpdateInput }) =>
      updateTask(taskId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}

export function useDeleteTask(entityType: CrmEntityType, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKey(entityType, entityId) });
    },
  });
}
