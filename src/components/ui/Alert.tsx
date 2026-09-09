import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  info: 'bg-brand-50 text-brand-900 border-brand-200',
  success: 'bg-surface text-neutral-900 border-success',
  warning: 'bg-surface text-neutral-900 border-warning',
  danger: 'bg-surface text-neutral-900 border-danger',
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}

export function Alert({ tone = 'info', title, children }: AlertProps) {
  return (
    <div role="alert" className={`rounded-lg border p-3 text-sm ${TONES[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
