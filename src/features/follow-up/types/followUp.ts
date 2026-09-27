// D-031: Notes/Tasks/Appointments sao polimorficos (entity_type + entity_id) — mesmo enum
// usado pelo backend (CrmEntityType), sem novos tipos.
export type CrmEntityType = 'lead' | 'customer' | 'opportunity';

export interface Note {
  id: string;
  entity_type: CrmEntityType;
  entity_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteCreateInput {
  entity_type: CrmEntityType;
  entity_id: string;
  content: string;
}

export interface NoteUpdateInput {
  content: string;
}

export interface NoteListResponse {
  data: Note[];
  page: number;
  limit: number;
  total: number;
}

export type TaskStatus = 'pending' | 'done' | 'overdue';

export interface Task {
  id: string;
  title: string;
  assigned_to: string;
  due_at: string;
  status: TaskStatus;
  entity_type: CrmEntityType | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  title: string;
  assigned_to: string;
  due_at: string;
  entity_type?: CrmEntityType;
  entity_id?: string;
}

export interface TaskUpdateInput {
  title?: string;
  due_at?: string;
  status?: TaskStatus;
}

export interface TaskListResponse {
  data: Task[];
  page: number;
  limit: number;
  total: number;
}

export interface Appointment {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  entity_type: CrmEntityType | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreateInput {
  user_id: string;
  starts_at: string;
  ends_at: string;
  entity_type?: CrmEntityType;
  entity_id?: string;
}

export interface AppointmentUpdateInput {
  starts_at?: string;
  ends_at?: string;
}

export interface AppointmentListResponse {
  data: Appointment[];
  page: number;
  limit: number;
  total: number;
}
