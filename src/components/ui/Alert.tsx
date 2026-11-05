import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'bg-info-soft border-brand-200', icon: 'text-brand-700', Icon: Info },
  success: { box: 'bg-success-soft border-success-mark', icon: 'text-success', Icon: CircleCheck },
  warning: {
    box: 'bg-warning-soft border-warning-mark',
    icon: 'text-warning',
    Icon: TriangleAlert,
  },
  danger: { box: 'bg-danger-soft border-danger', icon: 'text-danger', Icon: CircleAlert },
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}

// O significado nao depende so da cor: icone e titulo acompanham o tom.
export function Alert({ tone = 'info', title, children }: AlertProps) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div
      role="alert"
      className={`rounded-control flex gap-2.5 border p-3 text-sm text-neutral-900 ${box}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${icon}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
