import {
  Activity,
  ChevronRight,
  Columns3,
  Clock,
  Gauge,
  Palette,
  ShieldCheck,
  Signpost,
  UserRoundCheck,
  UsersRound,
  ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import { useRolesQuery } from '@/features/users/hooks/useUsers';

interface SettingsLink {
  to: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  // Basta uma delas.
  permission?: string | string[];
}

const LINKS: SettingsLink[] = [
  {
    to: '/settings/brand-identity',
    title: 'Identidade Visual',
    description:
      'Identidade da empresa no CRM. Alterações são feitas pela equipe do CRM Universal.',
    Icon: Palette,
    permission: ['branding:read', 'branding:manage'],
  },
  {
    to: '/settings/business-hours',
    title: 'Horário de funcionamento',
    description: 'Horário da empresa e restrição de acesso.',
    Icon: Clock,
    permission: 'tenant_settings:read',
  },
  {
    to: '/settings/access-exceptions',
    title: 'Liberações',
    description: 'Acessos excepcionais fora do horário.',
    Icon: ShieldCheck,
    permission: 'access_exceptions:manage',
  },
  {
    to: '/settings/lead-sources',
    title: 'Origens de Lead',
    description: 'De onde vêm os leads da empresa.',
    Icon: Signpost,
    permission: ['lead_sources:create', 'lead_sources:update', 'lead_sources:delete'],
  },
  {
    to: '/settings/closing-reasons',
    title: 'Motivos',
    description: 'Motivos de perda e de desqualificação.',
    Icon: ListChecks,
    permission: 'tenant_settings:update',
  },
  {
    to: '/settings/pipelines',
    title: 'Pipelines e etapas',
    description: 'Funis de venda e as etapas de cada um.',
    Icon: Columns3,
    permission: ['pipelines:create', 'pipelines:update', 'pipelines:delete'],
  },
  {
    to: '/settings/availability',
    title: 'Disponibilidade',
    description: 'Ligar ou desligar a disponibilidade da equipe.',
    Icon: UserRoundCheck,
    permission: 'tenant_settings:read',
  },
  {
    to: '/settings/users',
    title: 'Usuários',
    description: 'Pessoas com acesso ao CRM.',
    Icon: UsersRound,
    permission: 'users:read',
  },
  {
    to: '/settings/roles',
    title: 'Papéis e permissões',
    description: 'O que cada papel pode fazer.',
    Icon: ShieldCheck,
    permission: 'roles:read',
  },
  {
    to: '/plan',
    title: 'Plano',
    description: 'Situação do plano, consumo e limites.',
    Icon: Gauge,
  },
  {
    to: '/status',
    title: 'Status do sistema',
    description: 'Disponibilidade dos serviços.',
    Icon: Activity,
  },
];

export function SettingsHomePage() {
  const { hasPermission } = useAuth();
  const links = LINKS.filter(
    (link) =>
      !link.permission ||
      (Array.isArray(link.permission) ? link.permission : [link.permission]).some(hasPermission),
  );
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Configurações</h1>
        <p className="text-sm text-neutral-500">Administração da sua empresa no CRM Universal.</p>
      </header>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="bg-surface border-border-subtle rounded-card shadow-card hover:border-brand-300 flex h-full items-center gap-3 border p-4 transition-colors"
            >
              <span className="bg-brand-50 text-brand-700 rounded-control flex size-10 shrink-0 items-center justify-center">
                <link.Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-neutral-900">{link.title}</span>
                <span className="block text-xs text-neutral-500">{link.description}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-neutral-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1">
      <Breadcrumb items={[{ label: 'Configurações', to: '/settings' }, { label: title }]} />
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <p className="text-sm text-neutral-500">{description}</p>
    </header>
  );
}

export function RolesPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('roles:read');
  const { data, isLoading, isError, refetch } = useRolesQuery(canRead);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader title="Papéis e permissões" description="O que cada papel pode fazer." />
      {!canRead && (
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver os papéis.
        </Alert>
      )}
      {isLoading && <Spinner />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar os papéis">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && data.length === 0 && <EmptyState title="Nenhum papel encontrado" />}
      {data && data.length > 0 && (
        <Table label="Papéis">
          <Thead>
            <Th>Papel</Th>
            <Th>Tipo</Th>
            <Th className="text-right">Permissões</Th>
          </Thead>
          <Tbody>
            {data.map((role) => (
              <Tr key={role.id}>
                <Td className="font-medium text-neutral-900 capitalize">{role.name}</Td>
                <Td>
                  <Badge tone={role.is_system ? 'info' : 'neutral'}>
                    {role.is_system ? 'Padrão do sistema' : 'Personalizado'}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums">{role.permissions.length}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
