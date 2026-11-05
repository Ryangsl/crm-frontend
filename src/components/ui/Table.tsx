import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

interface TableProps {
  label: string;
  busy?: boolean;
  children: ReactNode;
}

// Tabela do design system. Em tela pequena, colunas secundarias usam `hidden md:table-cell`: a tabela
// cabe na tela em vez de rolar para o lado.
export function Table({ label, busy, children }: TableProps) {
  return (
    <div className="bg-surface border-border-subtle rounded-card shadow-card overflow-x-auto border">
      <table aria-label={label} aria-busy={busy || undefined} className="w-full text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-border-subtle border-b text-xs font-medium text-neutral-500">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ className = '', children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...rest} scope="col" className={`px-4 py-3 font-medium whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-border-subtle divide-y">{children}</tbody>;
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-surface-muted transition-colors">{children}</tr>;
}

export function Td({ className = '', children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...rest} className={`px-4 py-3 text-neutral-700 ${className}`}>
      {children}
    </td>
  );
}
