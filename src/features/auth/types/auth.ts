export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  // GET /v1/users/me ainda nao devolve `permissions` (gap documentado no relatorio da
  // Etapa 3.1) — ate o backend expor esse campo, chega sempre vazio e hasPermission()
  // sempre retorna false.
  permissions: string[];
  // Nomes dos papeis do usuario (GET /v1/users/me). So UX: a tela de usuarios usa para indicar o que
  // a pessoa pode conceder; quem decide e o backend (D-087).
  roles?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}
