import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/services/api';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  created_at?: string;
  // Nomes e ids dos papeis vigentes, na mesma ordem (D-087).
  roles?: string[];
  role_ids?: string[];
}

export interface TenantRole {
  id: string;
  name: string;
  is_system: boolean;
  permissions: string[];
}

interface UserListResponse {
  data: TenantUser[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role_ids: string[];
}

export interface UpdateUserInput {
  name?: string;
  role_ids?: string[];
}

export function useUsersQuery(page: number, enabled = true) {
  return useQuery({
    queryKey: ['users', 'list', page],
    queryFn: () => apiGet<UserListResponse>(`/v1/users?page=${page}&limit=20`),
    enabled,
  });
}

export function useRolesQuery(enabled = true) {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: () => apiGet<TenantRole[]>('/v1/roles'),
    enabled,
  });
}

// Toda escrita de usuario muda a lista, os nomes e, se for a propria pessoa, o /me (papeis).
function useInvalidateUsers() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['users'] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => apiPost<TenantUser>('/v1/users', input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      apiPatch<TenantUser>(`/v1/users/${id}`, input),
    onSuccess: invalidate,
  });
}

// "Excluir" usuario e desativacao logica; nao existe reativacao na API.
export function useDeactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/v1/users/${id}`),
    onSuccess: invalidate,
  });
}

interface UserDirectoryResponse {
  data: Array<{ id: string; name: string; status: 'active' | 'inactive' }>;
}

// Nomes para mostrar responsaveis: diretorio de colegas (D-089), sem e-mail nem papeis, aberto a todo
// usuario autenticado. Falha = mapa vazio e a tela usa o texto generico.
export function useUserNames(): Map<string, string> {
  const { status } = useAuth();
  const { data } = useQuery({
    queryKey: ['users', 'names'],
    queryFn: () => apiGet<UserDirectoryResponse>('/v1/users/directory'),
    enabled: status === 'authenticated',
  });
  return useMemo(() => new Map((data?.data ?? []).map((user) => [user.id, user.name])), [data]);
}
