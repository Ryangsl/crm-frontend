import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { Button } from './Button';

interface OverlayProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName: string;
  overlayClassName: string;
}

// Base de Modal e Drawer: fecha com Esc e no fundo, leva o foco para dentro e devolve ao sair.
function Overlay({ title, onClose, children, panelClassName, overlayClassName }: OverlayProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-40 flex ${overlayClassName}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-neutral-900/50"
        onClick={onClose}
        data-testid="overlay-backdrop"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex max-h-dvh flex-col outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

// Em celular abre como folha inferior; a partir de `sm`, centralizada. Nunca maior que a tela.
export function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <Overlay
      title={title}
      onClose={onClose}
      overlayClassName="items-end justify-center sm:items-center sm:p-4"
      panelClassName="bg-surface shadow-raised rounded-t-card sm:rounded-card w-full sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <Button size="sm" variant="ghost" aria-label="Fechar" onClick={onClose}>
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <div className="overflow-y-auto px-4 pb-4 text-sm text-neutral-700">{children}</div>
      {footer && (
        <div className="border-border-subtle flex justify-end gap-2 border-t p-4">{footer}</div>
      )}
    </Overlay>
  );
}

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Drawer({ title, onClose, children, className = 'bg-surface' }: DrawerProps) {
  return (
    <Overlay
      title={title}
      onClose={onClose}
      overlayClassName="justify-start"
      panelClassName={`shadow-raised h-dvh w-72 max-w-[85vw] overflow-y-auto ${className}`}
    >
      {children}
    </Overlay>
  );
}
