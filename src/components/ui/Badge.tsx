import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-neutral-700',
  info: 'bg-info-soft text-brand-800',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

const DOTS: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-400',
  info: 'bg-brand-600',
  success: 'bg-success-mark',
  warning: 'bg-warning-mark',
  danger: 'bg-danger',
};

// Rotulo curto de estado. O texto carrega o significado; a cor so reforca.
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// Indicador de estado com ponto, para listas e cabecalhos.
export function StatusIndicator({ tone = 'neutral', label }: { tone?: BadgeTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
      <span aria-hidden="true" className={`size-2 rounded-full ${DOTS[tone]}`} />
      {label}
    </span>
  );
}
