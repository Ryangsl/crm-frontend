import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface DropdownProps {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
}

// Menu simples de acoes. Fecha ao clicar fora, com Esc e ao escolher um item.
export function Dropdown({ label, trigger, children, triggerClassName = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="bg-surface border-border-subtle rounded-control shadow-raised absolute right-0 z-30 mt-1 w-56 max-w-[85vw] border p-1"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const dropdownItemClass =
  'min-h-touch lg:min-h-9 hover:bg-surface-muted flex w-full items-center gap-2 rounded-md px-3 text-left text-sm text-neutral-800';
