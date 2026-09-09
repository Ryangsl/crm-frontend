interface SpinnerProps {
  size?: 'sm' | 'md';
  label?: string;
}

const SIZES = { sm: 'size-4 border-2', md: 'size-6 border-2' } as const;

export function Spinner({ size = 'md', label = 'Carregando' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZES[size]}`}
    />
  );
}
