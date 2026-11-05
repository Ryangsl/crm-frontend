interface ProgressBarProps {
  label: string;
  percent: number;
  // Classe da barra, sempre de um token (ex.: bg-brand-600).
  barClassName?: string;
  trackClassName?: string;
}

export function ProgressBar({
  label,
  percent,
  barClassName = 'bg-brand-600',
  trackClassName = 'bg-surface-muted',
}: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 overflow-hidden rounded-full ${trackClassName}`}
    >
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${value}%` }} />
    </div>
  );
}
