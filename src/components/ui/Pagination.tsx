import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, noun, disabled, onChange }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-neutral-500">
        Página {page} de {totalPages} · {total} {noun}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1 || disabled}
          onClick={() => onChange(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages || disabled}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
