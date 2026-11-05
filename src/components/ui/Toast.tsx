import { CircleCheck } from 'lucide-react';
import { useEffect } from 'react';

const DURATION_MS = 4000;

// Confirmacao passageira de uma acao. Fica acima da barra inferior no celular.
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      className="bg-surface border-border-subtle rounded-control shadow-raised fixed inset-x-4 bottom-20 z-30 flex items-center gap-2 border p-3 text-sm text-neutral-900 lg:right-4 lg:bottom-4 lg:left-auto lg:w-80"
    >
      <CircleCheck aria-hidden="true" className="text-success size-4 shrink-0" />
      {message}
    </div>
  );
}
