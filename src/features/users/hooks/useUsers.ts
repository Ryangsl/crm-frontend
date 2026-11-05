import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { apiGet } from '@/services/api';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
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

// Nomes para mostrar responsaveis. Sem `users:read` o mapa fica vazio e a tela usa o texto generico.
export function useUserNames(): Map<string, string> {
  const { hasPermission } = useAuth();
  const { data } = useQuery({
    queryKey: ['users', 'names'],
    queryFn: () => apiGet<UserListResponse>('/v1/users?page=1&limit=100'),
    enabled: hasPermission('users:read'),
  });
  return useMemo(() => new Map((data?.data ?? []).map((user) => [user.id, user.name])), [data]);
}
