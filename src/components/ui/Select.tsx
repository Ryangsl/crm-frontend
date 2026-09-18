import type { ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, children, className = '', ...rest }: SelectProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={`min-h-touch bg-surface rounded-lg border px-3 text-base ${
          error ? 'border-danger' : 'border-border-subtle'
        } ${className}`}
      >
        {children}
      </select>
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}
