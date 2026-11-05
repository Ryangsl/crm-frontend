import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './Spinner';
import { useWriteBlockReason } from './write-access';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  // Acao que altera dados: fica desabilitada, com o motivo, quando a escrita esta indisponivel (ex.:
  // trial encerrado). Navegacao, filtros, paginacao e "tentar novamente" nao usam.
  writes?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-button text-on-button hover:bg-button-hover disabled:opacity-50',
  secondary:
    'bg-surface text-brand-700 border border-border-strong hover:bg-brand-50 disabled:text-neutral-400 disabled:hover:bg-surface',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50 disabled:text-neutral-400',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

// min-h-touch garante o alvo de 44px exigido em responsive.md secao 4; com ponteiro preciso (lg) a
// densidade executiva usa 40px.
const SIZES: Record<Size, string> = {
  sm: 'min-h-touch lg:min-h-9 px-3 text-sm',
  md: 'min-h-touch lg:min-h-control px-4 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  writes = false,
  disabled,
  children,
  className = '',
  title,
  ...rest
}: ButtonProps) {
  const writeBlockReason = useWriteBlockReason();
  const blocked = writes && writeBlockReason !== null;
  return (
    <button
      {...rest}
      title={blocked ? writeBlockReason : title}
      disabled={blocked || (disabled ?? loading)}
      aria-busy={loading || undefined}
      className={`rounded-control inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
