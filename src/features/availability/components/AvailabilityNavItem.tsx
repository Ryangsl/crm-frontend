import { Headset } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';
import { useMyAvailabilityQuery } from '../hooks/useAvailability';

function NavItemInner() {
  const { data } = useMyAvailabilityQuery(true);
  // Entrada do painel so com o mecanismo habilitado (flag desabilitada => oculta).
  if (!data?.enabled) return null;

  return (
    <li>
      <NavLink
        to="/team/availability"
        className={({ isActive }) =>
          `min-h-touch lg:min-h-10 rounded-control flex items-center gap-3 px-3 text-sm transition-colors ${
            isActive
              ? 'bg-sidebar-active text-on-sidebar-active font-medium'
              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink'
          }`
        }
      >
        <Headset aria-hidden="true" className="size-4 shrink-0" />
        Equipe
      </NavLink>
    </li>
  );
}

// Item de menu do painel de disponibilidade da equipe: so para `availability:read`.
export function AvailabilityNavItem() {
  const { hasPermission } = useAuth();
  if (!hasPermission('availability:read')) return null;
  return <NavItemInner />;
}
