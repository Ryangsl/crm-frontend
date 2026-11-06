import { ApiError } from '@/services/api';
import type { TenantRole } from '../hooks/useUsers';

// Espelho, so para UX, das regras de concessao do backend (D-087): quem concede precisa ter todas as
// permissoes do papel, e o papel de fabrica `admin` so e concedido ou retirado pela plataforma. A
// decisao e sempre do backend; aqui so se explica de antemao por que uma opcao esta indisponivel.
export function isFactoryAdminRole(role: Pick<TenantRole, 'name' | 'is_system'>): boolean {
  return role.is_system && role.name === 'admin';
}

export interface Grantor {
  permissions: string[];
  roles: string[];
}

export function grantBlockReason(role: TenantRole, me: Grantor): string | null {
  if (isFactoryAdminRole(role)) {
    return 'O papel Admin é concedido e retirado só pela equipe do CRM Universal.';
  }
  if (!role.permissions.every((permission) => me.permissions.includes(permission))) {
    return 'Inclui permissões que você não tem.';
  }
  return null;
}

const ISSUE_MESSAGES: Record<string, string> = {
  ADMIN_ROLE_PLATFORM_MANAGED:
    'O papel Admin é concedido e retirado só pela equipe do CRM Universal.',
  ADMIN_ROLE_REQUIRES_ADMIN: 'Somente um Admin pode alterar ou desativar outro Admin.',
  ADMIN_SELF_DEACTIVATION: 'Um Admin não pode desativar a si mesmo. Peça a outro Admin.',
  ROLE_EXCEEDS_ACTOR: 'Você só pode conceder ou retirar papéis cujas permissões você também tem.',
  TARGET_EXCEEDS_ACTOR: 'Você não pode alterar um usuário com permissões que você não tem.',
};

// Mensagem para os erros das telas de usuario. Codigos conhecidos em portugues claro; o resto usa a
// mensagem do backend.
export function userErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const issue = error.details[0]?.issue;
  switch (error.code) {
    case 'LAST_ADMIN':
      return 'A empresa precisa manter ao menos um Admin ativo.';
    case 'ROLE_ASSIGNMENT_FORBIDDEN':
      return (issue && ISSUE_MESSAGES[issue]) || ISSUE_MESSAGES.ROLE_EXCEEDS_ACTOR;
    case 'USER_MANAGEMENT_FORBIDDEN':
      return (issue && ISSUE_MESSAGES[issue]) || ISSUE_MESSAGES.TARGET_EXCEEDS_ACTOR;
    case 'EMAIL_ALREADY_IN_USE':
      return 'Já existe um usuário com este e-mail nesta empresa.';
    case 'FORBIDDEN':
      return 'Você não tem permissão para realizar esta ação.';
    case 'USER_ALREADY_ACTIVE':
      return 'Este usuário já está ativo.';
    case 'USER_NOT_ACTIVE':
      return 'Usuário desativado. Para devolver o acesso, use Reativar.';
    case 'PLAN_LIMIT_REACHED':
      return 'O plano atingiu o limite de usuários ativos. Desative outro usuário ou fale com o comercial.';
    case 'RATE_LIMITED':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
    default:
      return error.message || fallback;
  }
}
