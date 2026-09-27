import type { TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, className = '', rows = 3, ...rest }: TextareaProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`bg-surface rounded-lg border px-3 py-2 text-base ${
          error ? 'border-danger' : 'border-border-subtle'
        } ${className}`}
      />
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}
