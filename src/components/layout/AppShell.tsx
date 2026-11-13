import {
  Building2,
  CalendarCheck,
  ChevronDown,
  Clock,
  Contact,
  Gauge,
  KeyRound,
  Handshake,
  House,
  KanbanSquare,
  LogOut,
  Menu,
  MessagesSquare,
  Palette,
  Search,
  Settings,
  UserRoundSearch,
  UsersRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandMark';
import { Drawer } from '@/components/ui/Dialog';
import { Dropdown, dropdownItemClass } from '@/components/ui/Dropdown';
import { AccessStatusBanner } from '@/features/access-control/components/AccessStatusBanner';
import { useAuth } from '@/features/auth/useAuth';
import { AvailabilityNavItem } from '@/features/availability/components/AvailabilityNavItem';
import { AvailabilitySelector } from '@/features/availability/components/AvailabilitySelector';
import { BrandingApplier } from '@/features/branding/components/BrandingApplier';
import { useBrandingQuery } from '@/features/branding/hooks/useBranding';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { PlanAccessProvider } from '@/features/plan/components/PlanAccessProvider';
import { SidebarPlanCard } from '@/features/plan/components/SidebarPlanCard';
import { TrialShellNotice } from '@/features/plan/components/TrialShellNotice';

/*
 * Navegacao Mobile First (crm-spec/docs/06-frontend/design-system.md secao 4; D-042): barra inferior ate
 * `lg`, com os modulos mais usados e "Mais", e sidebar expandida a partir de `lg`. A estrutura e do
 * produto: a identidade do tenant muda cores e nome, nunca os itens nem a ordem.
 */
interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  end?: boolean;
  // Quando presente, o item so aparece para quem tem a permissao (apenas UX: o backend e a autoridade).
  permission?: string;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', Icon: House, end: true },
  { to: '/leads', label: 'Leads', Icon: UserRoundSearch },
  { to: '/customers', label: 'Clientes', Icon: Contact },
  { to: '/opportunities', label: 'Oportunidades', Icon: Handshake },
  { to: '/pipeline', label: 'Pipeline', Icon: KanbanSquare },
  { to: '/follow-ups', label: 'Follow-ups', Icon: CalendarCheck, permission: 'tasks:read' },
  {
    to: '/conversations',
    label: 'Conversas',
    Icon: MessagesSquare,
    permission: 'conversations:read',
  },
];

// Administracao: so para quem tem o papel Admin (apenas UX; o backend continua decidindo cada acao).
const ADMIN_ITEMS: NavItem[] = [
  {
    to: '/settings',
    label: 'Configurações',
    Icon: Settings,
    end: true,
    permission: 'tenant_settings:read',
  },
  { to: '/settings/users', label: 'Usuários', Icon: UsersRound, permission: 'users:read' },
  {
    to: '/settings/access-exceptions',
    label: 'Liberações',
    Icon: Clock,
    permission: 'access_exceptions:manage',
  },
  { to: '/plan', label: 'Plano', Icon: Gauge, end: true },
];

// Na barra lateral o contorno de foco usa a tinta da barra: a cor da marca pode nao contrastar com ela.
const SIDEBAR_FOCUS = '[&_:focus-visible]:outline-sidebar-ink';

// Barra inferior: so o que cabe sem cortar. O restante fica em "Mais".
const BOTTOM_ITEMS = ['/', '/leads', '/customers', '/pipeline'];

function sidebarLinkClass({ isActive }: { isActive: boolean }) {
  return `min-h-touch lg:min-h-10 flex items-center gap-3 rounded-control px-3 text-sm transition-colors ${
    isActive
      ? 'bg-sidebar-active text-on-sidebar-active font-medium'
      : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink'
  }`;
}

// Liberacoes tambem sao do Gerente (D-082): fora da Administracao para quem nao e Admin.
const EXCEPTIONS_ITEM = ADMIN_ITEMS.find((item) => item.to === '/settings/access-exceptions')!;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const allowed = (item: NavItem) => !item.permission || hasPermission(item.permission);
  const render = (item: NavItem) => (
    <li key={item.to}>
      <NavLink to={item.to} end={item.end} className={sidebarLinkClass} onClick={onNavigate}>
        <item.Icon aria-hidden="true" className="size-4 shrink-0" />
        {item.label}
      </NavLink>
    </li>
  );
  return (
    <nav aria-label="Principal" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1">
        {MAIN_ITEMS.filter(allowed).map(render)}
        {!isAdmin && allowed(EXCEPTIONS_ITEM) && render(EXCEPTIONS_ITEM)}
        <AvailabilityNavItem />
      </ul>
      {isAdmin && (
        <div>
          <p className="text-sidebar-muted border-sidebar-border mb-2 border-t px-3 pt-4 text-xs font-medium">
            Administração
          </p>
          <ul className="flex flex-col gap-1">{ADMIN_ITEMS.filter(allowed).map(render)}</ul>
        </div>
      )}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-full flex-col gap-5 p-4">
      <div className="px-1 pt-1">
        <BrandLockup />
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-3 pt-2">
        <SidebarPlanCard />
        {user && (
          <div className="border-sidebar-border border-t pt-3">
            <div className="bg-surface rounded-control mb-3 p-2 empty:hidden">
              <AvailabilitySelector />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sidebar-ink truncate text-sm font-medium">{user.name}</p>
                <p className="text-sidebar-muted truncate text-xs">{user.email}</p>
              </div>
              <button
                type="button"
                aria-label="Sair"
                title="Sair"
                onClick={() => void logout()}
                className="min-h-touch min-w-touch lg:min-h-9 lg:min-w-9 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink rounded-control flex shrink-0 items-center justify-center"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form role="search" onSubmit={submit} className="min-w-0 flex-1 lg:max-w-xl">
      <label className="bg-surface-muted rounded-control focus-within:outline-brand-600 flex min-h-touch items-center gap-2 px-3 focus-within:outline-2 lg:min-h-10">
        <Search aria-hidden="true" className="size-4 shrink-0 text-neutral-500" />
        <span className="sr-only">Buscar clientes e leads</span>
        <input
          ref={input}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar clientes e leads..."
          className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500 lg:text-sm"
        />
      </label>
    </form>
  );
}

function TenantMenu() {
  const { hasPermission, logout } = useAuth();
  const { data } = useBrandingQuery();
  const name = data?.display_name ?? 'Empresa';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <Dropdown
      label={`Empresa: ${name}`}
      triggerClassName="hover:bg-surface-muted rounded-control flex min-h-touch items-center gap-2 px-2 lg:min-h-10"
      trigger={
        <>
          <span
            aria-hidden="true"
            className="bg-brand-100 text-brand-800 rounded-control flex size-8 shrink-0 items-center justify-center text-xs font-semibold"
          >
            {initials || <Building2 className="size-4" />}
          </span>
          <span className="hidden max-w-40 min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-medium text-neutral-900">{name}</span>
            <span className="block text-xs text-neutral-500">Empresa</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-4 text-neutral-500 sm:block" />
        </>
      }
    >
      <Link role="menuitem" to="/account" className={dropdownItemClass}>
        <KeyRound aria-hidden="true" className="size-4" /> Minha conta
      </Link>
      <Link role="menuitem" to="/plan" className={dropdownItemClass}>
        <Gauge aria-hidden="true" className="size-4" /> Plano
      </Link>
      {(hasPermission('branding:read') || hasPermission('branding:manage')) && (
        <Link role="menuitem" to="/settings/brand-identity" className={dropdownItemClass}>
          <Palette aria-hidden="true" className="size-4" /> Identidade Visual
        </Link>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => void logout()}
        className={dropdownItemClass}
      >
        <LogOut aria-hidden="true" className="size-4" /> Sair
      </button>
    </Dropdown>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const items = BOTTOM_ITEMS.map((to) => MAIN_ITEMS.find((item) => item.to === to)!);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-touch flex flex-col items-center justify-center gap-0.5 py-1.5 text-xs ${
      isActive ? 'text-brand-700 font-semibold' : 'text-neutral-500'
    }`;
  return (
    <nav
      aria-label="Atalhos"
      className="border-border-subtle bg-surface fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className={linkClass}>
              <item.Icon aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMore}
            className={`w-full ${linkClass({ isActive: false })}`}
          >
            <Menu aria-hidden="true" className="size-5" />
            Mais
          </button>
        </li>
      </ul>
    </nav>
  );
}

function AppShellLayout() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);

  // Trocar de tela volta ao topo: a area de conteudo rola sozinha.
  useEffect(() => {
    main.current?.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside
        className={`bg-sidebar hidden w-64 shrink-0 overflow-y-auto lg:block ${SIDEBAR_FOCUS}`}
      >
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface border-border-subtle z-10 flex items-center gap-2 border-b px-3 py-2 lg:gap-4 lg:px-6">
          {user && <GlobalSearch />}
          {user && (
            <div className="flex shrink-0 items-center gap-1 lg:ml-auto">
              <NotificationBell align="right" />
              <TenantMenu />
            </div>
          )}
        </header>

        {/* pb-24 reserva espaco para a barra inferior fixa no celular e no tablet */}
        <main ref={main} className="min-w-0 flex-1 overflow-y-auto px-4 py-4 pb-24 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-[96rem]">
            {/* Seletor de disponibilidade fora da sidebar (celular e tablet) */}
            <AvailabilitySelector className="mb-3 lg:hidden" />
            {/* F4.7: aviso preventivo de acesso fora do horario (so para quem e restringido) */}
            {user && <AccessStatusBanner />}
            {/* D-085: modo de consulta precisa estar identificado em toda tela */}
            {user && <TrialShellNotice />}
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav onMore={() => setDrawerOpen(true)} />

      {drawerOpen && (
        <Drawer
          title="Menu"
          onClose={() => setDrawerOpen(false)}
          className={`bg-sidebar ${SIDEBAR_FOCUS}`}
        >
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            className="text-sidebar-muted hover:text-sidebar-ink min-h-touch min-w-touch absolute top-2 right-2 flex items-center justify-center"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}
    </div>
  );
}

export function AppShell() {
  return (
    <PlanAccessProvider>
      <BrandingApplier />
      <AppShellLayout />
    </PlanAccessProvider>
  );
}
