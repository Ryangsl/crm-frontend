import { NavLink } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';
import { useMyAvailabilityQuery } from '../hooks/useAvailability';

interface AvailabilityNavItemProps {
  variant: 'sidebar' | 'bottom';
}

function navClasses(isActive: boolean) {
  return isActive ? 'text-brand-700 font-semibold' : 'text-neutral-500';
}

function NavItemInner({ variant }: AvailabilityNavItemProps) {
  const { data } = useMyAvailabilityQuery(true);
  // Entrada do painel so com o mecanismo habilitado (flag desabilitada => oculta).
  if (!data?.enabled) return null;

  if (variant === 'sidebar') {
    return (
      <li>
        <NavLink
          to="/team/availability"
          className={({ isActive }) =>
            `min-h-touch hover:bg-surface-muted flex items-center gap-2 rounded-lg px-3 text-sm ${navClasses(isActive)}`
          }
        >
          <span aria-hidden="true">◉</span>
          Equipe
        </NavLink>
      </li>
    );
  }
  return (
    <li className="flex-1">
      <NavLink
        to="/team/availability"
        className={({ isActive }) =>
          `min-h-touch flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${navClasses(isActive)}`
        }
      >
        <span aria-hidden="true">◉</span>
        Equipe
      </NavLink>
    </li>
  );
}

// Item de menu do painel de disponibilidade da equipe: so para `availability:read`.
export function AvailabilityNavItem({ variant }: AvailabilityNavItemProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission('availability:read')) return null;
  return <NavItemInner variant={variant} />;
}
