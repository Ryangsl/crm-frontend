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

// "Excluir" usuario e desativacao logica; a volta e pela reativacao (D-093).
export function useDeactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/v1/users/${id}`),
    onSuccess: invalidate,
  });
}

// Link de redefinicao de senha de uso unico (D-064). O token so aparece nesta resposta.
export interface PasswordResetLink {
  token: string;
  expires_at: string;
}

export function useCreatePasswordResetLink() {
  return useMutation({
    mutationFn: (id: string) => apiPost<PasswordResetLink>(`/v1/users/${id}/password-reset`),
  });
}

// D-093: reativa com os papeis anteriores; a senha antiga deixa de valer e vem um link para a nova.
export function useReactivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<TenantUser & { password_reset: PasswordResetLink }>(`/v1/users/${id}/reactivate`),
    onSuccess: invalidate,
  });
}

interface UserDirectoryResponse {
  data: Array<{ id: string; name: string; status: 'active' | 'inactive' }>;
}

export type DirectoryUser = UserDirectoryResponse['data'][number];

// Diretorio de colegas (D-089): so id, nome e situacao, aberto a todo usuario autenticado.
export function useUserDirectory() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['users', 'names'],
    queryFn: () => apiGet<UserDirectoryResponse>('/v1/users/directory'),
    enabled: status === 'authenticated',
  });
}

// Nomes para mostrar responsaveis. Falha = mapa vazio e a tela usa o texto generico.
export function useUserNames(): Map<string, string> {
  const { data } = useUserDirectory();
  return useMemo(() => new Map((data?.data ?? []).map((user) => [user.id, user.name])), [data]);
}
