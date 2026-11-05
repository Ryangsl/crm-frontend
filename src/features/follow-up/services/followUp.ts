import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentListResponse,
  AppointmentUpdateInput,
  CrmEntityType,
  Note,
  NoteCreateInput,
  NoteListResponse,
  NoteUpdateInput,
  Task,
  TaskCreateInput,
  TaskListResponse,
  TaskUpdateInput,
} from '../types/followUp';

function entityQuery(entityType: CrmEntityType, entityId: string): string {
  return `entity_type=${entityType}&entity_id=${entityId}`;
}

// ----------------------------------------------------------------------------------- NOTES

export function listNotes(entityType: CrmEntityType, entityId: string): Promise<NoteListResponse> {
  return apiGet<NoteListResponse>(`/v1/notes?${entityQuery(entityType, entityId)}&limit=100`);
}

export function createNote(input: NoteCreateInput): Promise<Note> {
  return apiPost<Note>('/v1/notes', input);
}

export function updateNote(id: string, input: NoteUpdateInput): Promise<Note> {
  return apiPatch<Note>(`/v1/notes/${id}`, input);
}

export function deleteNote(id: string): Promise<void> {
  return apiDelete<void>(`/v1/notes/${id}`);
}

// ----------------------------------------------------------------------------------- TASKS

export interface ScheduledTasksParams {
  assigned_to?: string;
  status?: 'pending' | 'done' | 'overdue';
  due_from?: string;
  due_to?: string;
}

// Visao transversal, sem filtrar por registro de origem.
export function listScheduledTasks(params: ScheduledTasksParams): Promise<TaskListResponse> {
  const query = new URLSearchParams({ limit: '100' });
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return apiGet<TaskListResponse>(`/v1/tasks?${query.toString()}`);
}

export interface ScheduledAppointmentsParams {
  user_id?: string;
  starts_from?: string;
  starts_to?: string;
}

export function listScheduledAppointments(
  params: ScheduledAppointmentsParams,
): Promise<AppointmentListResponse> {
  const query = new URLSearchParams({ limit: '100' });
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return apiGet<AppointmentListResponse>(`/v1/appointments?${query.toString()}`);
}

export function listTasks(entityType: CrmEntityType, entityId: string): Promise<TaskListResponse> {
  return apiGet<TaskListResponse>(`/v1/tasks?${entityQuery(entityType, entityId)}&limit=100`);
}

export function createTask(input: TaskCreateInput): Promise<Task> {
  return apiPost<Task>('/v1/tasks', input);
}

export function updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
  return apiPatch<Task>(`/v1/tasks/${id}`, input);
}

export function deleteTask(id: string): Promise<void> {
  return apiDelete<void>(`/v1/tasks/${id}`);
}

// ----------------------------------------------------------------------------- APPOINTMENTS

export function listAppointments(
  entityType: CrmEntityType,
  entityId: string,
): Promise<AppointmentListResponse> {
  return apiGet<AppointmentListResponse>(
    `/v1/appointments?${entityQuery(entityType, entityId)}&limit=100`,
  );
}

export function createAppointment(input: AppointmentCreateInput): Promise<Appointment> {
  return apiPost<Appointment>('/v1/appointments', input);
}

export function updateAppointment(id: string, input: AppointmentUpdateInput): Promise<Appointment> {
  return apiPatch<Appointment>(`/v1/appointments/${id}`, input);
}

export function deleteAppointment(id: string): Promise<void> {
  return apiDelete<void>(`/v1/appointments/${id}`);
}
