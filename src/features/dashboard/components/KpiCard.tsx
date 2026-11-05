import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  label: string;
  value: string;
  deltaPercent: number | null;
  Icon: LucideIcon;
  to: string;
}

function Delta({ percent }: { percent: number | null }) {
  // Sem base de comparacao, o painel diz isso em vez de mostrar um percentual inventado.
  if (percent === null) {
    return <p className="text-xs text-neutral-500">Sem base de comparação</p>;
  }
  const up = percent > 0;
  const Icon = percent === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const tone = percent === 0 ? 'text-neutral-500' : up ? 'text-success' : 'text-danger';
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
      <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
        <Icon aria-hidden="true" className="size-3.5" />
        {up ? '+' : ''}
        {percent}%
      </span>
      novos vs. período anterior
    </p>
  );
}

export function KpiCard({ label, value, deltaPercent, Icon, to }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="bg-surface border-border-subtle rounded-card shadow-card hover:border-brand-300 flex min-w-0 items-start gap-3 border p-4 transition-colors lg:p-5"
    >
      <span className="bg-brand-50 text-brand-700 rounded-control flex size-10 shrink-0 items-center justify-center">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-neutral-500">{label}</span>
        <span className="block truncate text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
          {value}
        </span>
        <Delta percent={deltaPercent} />
      </span>
    </Link>
  );
}
