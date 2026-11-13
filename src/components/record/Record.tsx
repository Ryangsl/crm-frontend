import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';

// Ficha de registro (Lead, Cliente, Oportunidade): cabecalho com as acoes principais, coluna de
// trabalho (historico, conversas, acompanhamento) e, ao lado, o resumo com os dados do registro.
// No celular o resumo vem primeiro, porque e o que se consulta antes de agir.

interface RecordHeaderProps {
  breadcrumb: BreadcrumbItem[];
  title: string;
  badge?: ReactNode;
  // Linha curta abaixo do titulo (ex.: cliente da oportunidade).
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function RecordHeader({ breadcrumb, title, badge, subtitle, actions }: RecordHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <Breadcrumb items={breadcrumb} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words text-neutral-900">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <div className="text-sm text-neutral-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function RecordLayout({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">{main}</div>
      <aside className="order-1 flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:order-2">
        {aside}
      </aside>
    </div>
  );
}

export function SummaryCard({
  title = 'Resumo',
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card title={title} footer={footer}>
      <dl className="flex flex-col gap-3">{children}</dl>
    </Card>
  );
}

export function SummaryItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    // Dentro de <dl> so cabe um nivel de <div> com <dt>/<dd>: o icone vai no <dt>, fora do fluxo.
    <div className="relative min-w-0 pl-11">
      <dt className="text-xs text-neutral-500">
        <span
          aria-hidden="true"
          className="bg-surface-muted rounded-control absolute top-0.5 left-0 flex size-8 items-center justify-center"
        >
          <Icon className="size-4" />
        </span>
        {label}
      </dt>
      <dd className="text-sm break-words text-neutral-900">{children}</dd>
    </div>
  );
}

export type StepTone = 'brand' | 'success' | 'danger';

export interface Step {
  id: string;
  label: string;
  state: 'done' | 'current' | 'upcoming';
}

const CURRENT_BAR: Record<StepTone, string> = {
  brand: 'bg-brand-600',
  success: 'bg-success-mark',
  danger: 'bg-danger',
};

// Onde o registro esta no funil. O texto diz a etapa; a barra so reforca.
export function StageSteps({
  label,
  steps,
  tone = 'brand',
}: {
  label: string;
  steps: Step[];
  tone?: StepTone;
}) {
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const current = steps[currentIndex];

  return (
    <div className="bg-surface border-border-subtle rounded-card shadow-card flex flex-col gap-2 border px-4 py-3 lg:px-5">
      <p className="text-sm text-neutral-600">
        <span className="font-medium text-neutral-900">{label}:</span>{' '}
        {current ? (
          <>
            {current.label}
            <span className="text-neutral-500">
              {' '}
              · etapa {currentIndex + 1} de {steps.length}
            </span>
          </>
        ) : (
          '—'
        )}
      </p>
      <ol aria-label={label} className="flex gap-1.5">
        {steps.map((step) => (
          <li
            key={step.id}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full ${
                step.state === 'current'
                  ? CURRENT_BAR[tone]
                  : step.state === 'done'
                    ? 'bg-brand-600 opacity-40'
                    : 'bg-surface-muted'
              }`}
            />
            <span
              className={`hidden truncate text-xs sm:block ${
                step.state === 'current' ? 'font-medium text-neutral-900' : 'text-neutral-500'
              }`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
