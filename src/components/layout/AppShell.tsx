import { NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

/*
 * Navegacao Mobile First (crm-spec/docs/06-frontend/design-system.md secao 4):
 * bottom navigation ate `md`, sidebar a partir de `lg` — o criterio e apenas
 * largura de viewport (D-042). A mesma hierarquia de itens vale nos dois modos.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '■', end: true },
  { to: '/customers', label: 'Clientes', icon: '◆', end: false },
  { to: '/status', label: 'Status', icon: '●', end: true },
] as const;

function navClasses(isActive: boolean) {
  return isActive ? 'text-brand-700 font-semibold' : 'text-neutral-500';
}

export function AppShell() {
  const { user, logout } = useAuth();

  function handleLogout() {
    void logout();
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sidebar — desktop */}
      <aside className="border-border-subtle bg-surface hidden w-60 shrink-0 flex-col border-r p-4 lg:flex">
        <p className="mb-6 text-sm font-bold tracking-wide text-neutral-900">CRM + Call Center</p>
        <nav aria-label="Principal">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `min-h-touch hover:bg-surface-muted flex items-center gap-2 rounded-lg px-3 text-sm ${navClasses(isActive)}`
                  }
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {user && (
          <div className="border-border-subtle mt-auto border-t pt-4">
            <p className="truncate text-sm text-neutral-700">{user.name}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        )}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-border-subtle bg-surface sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 lg:hidden">
          <p className="text-sm font-bold text-neutral-900">CRM + Call Center</p>
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          )}
        </header>

        {/* pb-20 reserva espaco para a bottom nav fixa no mobile */}
        <main className="flex-1 px-4 py-4 pb-20 lg:px-8 lg:pb-8">
          <Outlet />
        </main>

        {/* Bottom navigation — mobile/tablet */}
        <nav
          aria-label="Principal"
          className="border-border-subtle bg-surface fixed inset-x-0 bottom-0 z-10 border-t lg:hidden"
        >
          <ul className="flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `min-h-touch flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${navClasses(isActive)}`
                  }
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
